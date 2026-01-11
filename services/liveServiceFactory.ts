
import { VoiceProvider } from '../types';
import { ILiveVoiceService } from './liveVoiceService';
import { GeminiLiveService } from './geminiLiveService';
import { ZhipuRealtimeService } from './zhipuRealtimeService';
import { storageService } from './storageService';

export class LiveServiceFactory {
  static create(roleProvider: VoiceProvider): ILiveVoiceService {
    const settings = storageService.getSettings();
    const credentials = settings.credentials;
    
    const provider = settings.preferredRealtimeProvider || roleProvider;
    const model = settings.preferredRealtimeModel;
    
    const geminiKey = credentials[VoiceProvider.GEMINI] || process.env.API_KEY || '';
    const openAiKey = credentials[VoiceProvider.OPENAI] || '';
    const zhipuKey = credentials[VoiceProvider.ZHIPU_GLM] || '';

    switch (provider) {
      case VoiceProvider.GEMINI:
        return new GeminiLiveService(geminiKey, model);
        
      case VoiceProvider.ZHIPU_GLM:
        return new ZhipuRealtimeService(zhipuKey);
        
      case VoiceProvider.OPENAI:
        // OpenAI Realtime 暂借用 Gemini 结构作为接口占位，
        // 在实际生产中需替换为原生 OpenAI WebSocket 实现
        return new GeminiLiveService(openAiKey, model);
        
      default:
        return new GeminiLiveService(geminiKey, model);
    }
  }
}
