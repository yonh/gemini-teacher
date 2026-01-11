
import { VoiceProvider } from '../types';
import { ILiveVoiceService } from './liveVoiceService';
import { GeminiLiveService } from './geminiLiveService';
import { ZhipuRealtimeService } from './zhipuRealtimeService';
import { storageService } from './storageService';

export class LiveServiceFactory {
  static create(provider: VoiceProvider): ILiveVoiceService {
    const credentials = storageService.getCredentials();
    
    switch (provider) {
      case VoiceProvider.GEMINI:
        // Gemini always uses the environment key per strict requirements
        return new GeminiLiveService(process.env.API_KEY || '');
      case VoiceProvider.ZHIPU_GLM:
        return new ZhipuRealtimeService(credentials[VoiceProvider.ZHIPU_GLM] || '');
      case VoiceProvider.OPENAI:
        return new GeminiLiveService(process.env.API_KEY || ''); // Placeholder
      case VoiceProvider.OPENROUTER:
        return new GeminiLiveService(process.env.API_KEY || ''); // Placeholder
      default:
        return new GeminiLiveService(process.env.API_KEY || '');
    }
  }
}
