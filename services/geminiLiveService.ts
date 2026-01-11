
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { ILiveVoiceService, LiveHandlers, audioUtils } from './liveVoiceService';

export class GeminiLiveService implements ILiveVoiceService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private inputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private modelName: string;

  constructor(_apiKey?: string, modelName: string = 'gemini-2.5-flash-native-audio-preview-12-2025') {
    // API key must be obtained exclusively from the environment variable process.env.API_KEY.
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.modelName = modelName;
  }

  async connect(systemInstruction: string, handlers: LiveHandlers, tools?: any[]) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.sessionPromise = this.ai.live.connect({
      model: this.modelName, // 使用配置的模型
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction,
        tools: tools ? [{ functionDeclarations: tools }] : undefined,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => this.streamMicrophone(),
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            handlers.onTranscription?.(message.serverContent.inputTranscription.text, true);
          }
          if (message.serverContent?.outputTranscription) {
            handlers.onTranscription?.(message.serverContent.outputTranscription.text, false);
          }
          if (message.serverContent?.turnComplete) {
            handlers.onTurnComplete?.();
          }
          if (message.toolCall) {
            handlers.onToolCall?.(message.toolCall.functionCalls);
            for (const fc of message.toolCall.functionCalls) {
              this.sendToolResponse(fc.id, fc.name, "ok");
            }
          }

          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio && this.audioContext) {
            this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
            const audioBuffer = await audioUtils.decodeAudioData(audioUtils.decode(base64Audio), this.audioContext, 24000, 1);
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            source.addEventListener('ended', () => this.sources.delete(source));
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
          }

          if (message.serverContent?.interrupted) {
            this.stopAllAudio();
          }
        },
        onerror: (e: any) => handlers.onError?.(e),
        onclose: (e: CloseEvent) => handlers.onClose?.(e),
      },
    });

    return this.sessionPromise;
  }

  sendToolResponse(id: string, name: string, response: any) {
    this.sessionPromise?.then((session) => {
      session.sendToolResponse({
        functionResponses: {
          id,
          name,
          response: { result: response }
        }
      });
    });
  }

  private streamMicrophone() {
    if (!this.inputAudioContext || !this.stream) return;
    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    const processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = this.createPcmBlob(inputData);
      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(processor);
    processor.connect(this.inputAudioContext.destination);
  }

  private createPcmBlob(data: Float32Array): { data: string, mimeType: string } {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return {
      data: audioUtils.encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private stopAllAudio() {
    this.sources.forEach(s => { try { s.stop(); } catch (e) {} });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  async disconnect() {
    if (this.sessionPromise) {
      const session = await this.sessionPromise;
      session.close();
    }
    this.stopAllAudio();
    this.audioContext?.close();
    this.inputAudioContext?.close();
    this.stream?.getTracks().forEach(track => track.stop());
  }
}
