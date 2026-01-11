
import { ILiveVoiceService, LiveHandlers, audioUtils } from './liveVoiceService';

/**
 * ZhipuRealtimeService 实现智谱 AI 的 GLM-Realtime 协议
 * 参考文档: https://docs.bigmodel.cn/cn/guide/models/sound-and-video/glm-realtime
 */
export class ZhipuRealtimeService implements ILiveVoiceService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private inputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async connect(systemInstruction: string, handlers: LiveHandlers) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 智谱 AI WebSocket 地址 (示例，实际需根据文档确定鉴权方式)
    // 通常智谱需要 JWT 鉴权，这里假设通过 API_KEY 或已处理好的鉴权地址连接
    const url = `wss://open.bigmodel.cn/api/paas/v4/realtime`;
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        // 1. 发送 session.update 配置
        this.send({
          type: 'session.update',
          session: {
            modalities: ['audio', 'text'],
            instructions: systemInstruction,
            voice: 'alloy', // 智谱支持的音色
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: { type: 'server_vad' }
          }
        });
        
        this.streamMicrophone();
        resolve(this.ws);
      };

      this.ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'response.audio_transcript.delta':
            handlers.onTranscription?.(message.delta, false);
            break;
          case 'input_audio_buffer.speech_started':
            this.stopAllAudio(); // 听到用户说话，停止播放
            break;
          case 'response.audio.delta':
            if (this.audioContext) {
              const audioData = audioUtils.decode(message.delta);
              const audioBuffer = await audioUtils.decodeAudioData(audioData, this.audioContext, 24000, 1);
              this.playAudioBuffer(audioBuffer);
            }
            break;
          case 'response.done':
            handlers.onTurnComplete?.();
            break;
          case 'error':
            handlers.onError?.(message.error);
            break;
        }
      };

      this.ws.onerror = (err) => {
        handlers.onError?.(err);
        reject(err);
      };

      this.ws.onclose = (e) => {
        handlers.onClose?.(e);
      };
    });
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private streamMicrophone() {
    if (!this.inputAudioContext || !this.stream) return;
    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    const processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const int16Data = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        int16Data[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
      }
      
      this.send({
        type: 'input_audio_buffer.append',
        audio: audioUtils.encode(new Uint8Array(int16Data.buffer))
      });
    };

    source.connect(processor);
    processor.connect(this.inputAudioContext.destination);
  }

  private playAudioBuffer(buffer: AudioBuffer) {
    if (!this.audioContext) return;
    this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
  }

  private stopAllAudio() {
    this.sources.forEach(s => { try { s.stop(); } catch (e) {} });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  async disconnect() {
    this.stopAllAudio();
    this.ws?.close();
    this.audioContext?.close();
    this.inputAudioContext?.close();
    this.stream?.getTracks().forEach(t => t.stop());
  }
}
