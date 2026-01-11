
import { VoiceProvider } from '../types';
import { ILiveVoiceService } from './liveVoiceService';
import { GeminiLiveService } from './geminiLiveService';
import { ZhipuRealtimeService } from './zhipuRealtimeService';

export class LiveServiceFactory {
  static create(provider: VoiceProvider, apiKey?: string): ILiveVoiceService {
    const key = apiKey || process.env.API_KEY || '';
    
    switch (provider) {
      case VoiceProvider.GEMINI:
        return new GeminiLiveService(key);
      case VoiceProvider.ZHIPU_GLM:
        return new ZhipuRealtimeService(key);
      case VoiceProvider.OPENAI:
        console.warn("OpenAI Realtime 尚未完全实现，暂时回退到 Gemini");
        return new GeminiLiveService(key);
      case VoiceProvider.OPENROUTER:
        console.warn("OpenRouter 尚未完全实现，暂时回退到 Gemini");
        return new GeminiLiveService(key);
      default:
        return new GeminiLiveService(key);
    }
  }
}
