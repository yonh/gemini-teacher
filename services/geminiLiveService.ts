
import { GoogleGenAI, LiveServerMessage, Modality, Type, Blob } from '@google/genai';

export interface LiveHandlers {
  onTranscription?: (text: string, isUser: boolean) => void;
  onTurnComplete?: () => void;
  onToolCall?: (functionCalls: any[]) => void;
  onError?: (error: any) => void;
  onClose?: (e: CloseEvent) => void;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private inputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(systemInstruction: string, handlers: LiveHandlers, tools?: any[]) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction,
        tools: tools ? [{ functionDeclarations: tools }] : undefined,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        // 关键：必须开启转写才能在 UI 显示文字气泡
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
          this.streamMicrophone();
        },
        onmessage: async (message: LiveServerMessage) => {
          // 处理用户转写（实时显示用户说的内容）
          if (message.serverContent?.inputTranscription) {
            handlers.onTranscription?.(message.serverContent.inputTranscription.text, true);
          }
          // 处理 AI 转写（实时显示 AI 说的内容）
          if (message.serverContent?.outputTranscription) {
            handlers.onTranscription?.(message.serverContent.outputTranscription.text, false);
          }
          // 轮次结束，用于 commit 消息到历史记录
          if (message.serverContent?.turnComplete) {
            handlers.onTurnComplete?.();
          }
          
          if (message.toolCall) {
            handlers.onToolCall?.(message.toolCall.functionCalls);
            for (const fc of message.toolCall.functionCalls) {
              this.sessionPromise?.then((session) => {
                session.sendToolResponse({
                  functionResponses: [{ id: fc.id, name: fc.name, response: { result: "ok" } }]
                });
              });
            }
          }

          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio && this.audioContext) {
            this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), this.audioContext, 24000, 1);
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            source.addEventListener('ended', () => {
              this.sources.delete(source);
            });
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
          }

          if (message.serverContent?.interrupted) {
            this.stopAllAudio();
          }
        },
        onerror: (e: any) => {
          console.error("Live API Error:", e);
          handlers.onError?.(e);
        },
        onclose: (e: CloseEvent) => {
          handlers.onClose?.(e);
        },
      },
    });

    return this.sessionPromise;
  }

  private streamMicrophone() {
    if (!this.inputAudioContext || !this.stream) return;
    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    const processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = this.createPcmBlob(inputData);
      if (this.sessionPromise) {
        this.sessionPromise.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
        }).catch(() => {});
      }
    };

    source.connect(processor);
    processor.connect(this.inputAudioContext.destination);
  }

  private createPcmBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private stopAllAudio() {
    for (const source of this.sources.values()) {
      try { source.stop(); } catch (e) {}
    }
    this.sources.clear();
    this.nextStartTime = 0;
  }

  async disconnect() {
    if (this.sessionPromise) {
      const session = await this.sessionPromise;
      session.close();
      this.sessionPromise = null;
    }
    this.stopAllAudio();
    if (this.audioContext) await this.audioContext.close();
    if (this.inputAudioContext) await this.inputAudioContext.close();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}
