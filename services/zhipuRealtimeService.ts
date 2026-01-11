
import { ILiveVoiceService, LiveHandlers, audioUtils } from './liveVoiceService';

/**
 * ZhipuRealtimeService - 深度对齐 MetaGLM/glm-realtime-sdk 官方实现
 * 1. 鉴权：HS256 签名，timestamp/exp 使用秒(seconds)
 * 2. 时序：必须在收到 'session.created' 事件后发送 'session.update'
 * 3. 音频：全链路 24000Hz PCM16
 */
export class ZhipuRealtimeService implements ILiveVoiceService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private inputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private apiKey: string;
  private processor: ScriptProcessorNode | null = null;
  private sessionUpdated = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 生成智谱 V4 鉴权 Token
   * 严格遵循官方签名算法
   */
  private async generateToken(): Promise<string> {
    const parts = this.apiKey.split('.');
    if (parts.length !== 2) {
      throw new Error("API Key 格式不正确。请使用 'ID.Secret' 格式。");
    }
    const [id, secret] = parts;

    // 1. Header: 智谱固定格式
    const header = { alg: "HS256", sign_type: "SIGN" };
    
    // 2. Payload: 使用秒为单位的时间戳
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      api_key: id,
      exp: now + 3600, // 1小时后过期
      timestamp: now
    };

    // 标准 Base64URL 编码 (无填充, 字符替换)
    const base64UrlEncode = (data: Uint8Array | string) => {
      let base64;
      if (typeof data === 'string') {
        base64 = btoa(unescape(encodeURIComponent(data)));
      } else {
        let binary = '';
        for (let i = 0; i < data.length; i++) {
          binary += String.fromCharCode(data[i]);
        }
        base64 = btoa(binary);
      }
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // 3. HMAC-SHA256 签名
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(signingInput));
    const encodedSignature = base64UrlEncode(new Uint8Array(signature));

    return `${signingInput}.${encodedSignature}`;
  }

  async connect(systemInstruction: string, handlers: LiveHandlers) {
    if (!this.apiKey || !this.apiKey.includes('.')) {
      throw new Error("请先在 [设置] 中正确配置智谱 API Key (ID.Secret)。");
    }

    // 初始化音频
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      throw new Error("无法调用麦克风，请确保已授予权限并使用 HTTPS。");
    }

    const token = await this.generateToken();
    const url = `wss://open.bigmodel.cn/api/paas/v4/realtime?authorization=${token}`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
      } catch (e: any) {
        reject(new Error(`WebSocket 创建失败: ${e.message}`));
        return;
      }

      const timeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          this.ws.close();
          reject(new Error("智谱服务连接超时。请检查网络环境或 API Key。"));
        }
      }, 15000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        console.log("[Zhipu] WebSocket 通道已打开，等待会话就绪...");
        // 注意：不在这里发送 session.update，等待服务器下发 session.created
        this.startMicStreaming();
        resolve(this.ws);
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          switch (msg.type) {
            case 'session.created':
              console.log("[Zhipu] 会话已创建:", msg.session.id);
              // 关键时序：收到 created 后再 update
              this.send({
                type: "session.update",
                session: {
                  model: "glm-4-realtime",
                  modalities: ["audio", "text"],
                  instructions: systemInstruction,
                  voice: "puck", 
                  input_audio_format: "pcm16",
                  output_audio_format: "pcm16",
                  turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    silence_duration_ms: 600
                  }
                }
              });
              this.sessionUpdated = true;
              break;

            case 'response.audio_transcript.delta':
              handlers.onTranscription?.(msg.delta, false);
              break;

            case 'input_audio_buffer.speech_started':
              this.stopAllPlayback();
              break;

            case 'response.audio.delta':
              if (this.audioContext && msg.delta) {
                const raw = audioUtils.decode(msg.delta);
                const buffer = await audioUtils.decodeAudioData(raw, this.audioContext, 24000, 1);
                this.playAudio(buffer);
              }
              break;

            case 'response.done':
              handlers.onTurnComplete?.();
              break;

            case 'error':
              console.error("[Zhipu] 业务错误:", msg.error);
              handlers.onError?.(new Error(msg.error.message || "智谱 AI 返回错误"));
              break;
          }
        } catch (e) {
          console.error("[Zhipu] 消息解析失败:", e);
        }
      };

      this.ws.onerror = (e) => {
        clearTimeout(timeout);
        console.error("[Zhipu] WebSocket 握手或运行错误", e);
        reject(new Error("连接失败：握手被服务器拒绝。请检查 API Key 格式 (ID.Secret) 或是否欠费。"));
      };

      this.ws.onclose = (e) => {
        clearTimeout(timeout);
        console.warn(`[Zhipu] 连接关闭 (Code: ${e.code}, Reason: ${e.reason})`);
        if (e.code === 4001) handlers.onError?.(new Error("鉴权失败：Token 无效或已过期。"));
        else if (e.code === 4002) handlers.onError?.(new Error("连接受限：并发数超限或配额不足。"));
        handlers.onClose?.(e);
      };
    });
  }

  private startMicStreaming() {
    if (!this.inputAudioContext || !this.stream) return;
    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      
      const input = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      this.send({
        type: 'input_audio_buffer.append',
        audio: audioUtils.encode(new Uint8Array(int16.buffer))
      });
    };

    source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private playAudio(buffer: AudioBuffer) {
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

  private stopAllPlayback() {
    this.sources.forEach(s => { try { s.stop(); } catch (e) {} });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  async disconnect() {
    this.stopAllPlayback();
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    this.ws?.close();
    this.audioContext?.close();
    this.inputAudioContext?.close();
    this.stream?.getTracks().forEach(t => t.stop());
  }
}
