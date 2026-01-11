
import { GoogleGenAI, Modality } from "@google/genai";
import { OpenRouterService } from "./openRouterService";
import { storageService } from "./storageService";
import { VoiceProvider, Role } from "../types";
import { audioUtils } from "./liveVoiceService";

export const textAiService = {
  async generate(prompt: string): Promise<string> {
    const settings = storageService.getSettings();
    const provider = settings.preferredTextProvider || VoiceProvider.GEMINI;
    const model = settings.preferredTextModel || "gemini-3-flash-preview";

    if (provider === VoiceProvider.OPENROUTER) {
      const apiKey = settings.credentials[VoiceProvider.OPENROUTER] || "";
      const or = new OpenRouterService(apiKey);
      return await or.generateText(prompt, model);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text || "";
  },

  /**
   * 增强型 TTS：不仅播放文本，还注入角色性格以还原语调
   */
  async speakWithPersona(text: string, role: Role): Promise<void> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // 根据语种选择基础发音人
    const baseVoice = role.language === 'Chinese' ? 'Puck' : 'Kore';
    
    // 注入情感和性格指令，尝试还原“现场语调”
    const emotionalPrompt = `You are ${role.name}. ${role.description}. 
    Read the following text with your unique personality, tone, and accent:
    "${text}"`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: emotionalPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: baseVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await audioUtils.decodeAudioData(
          audioUtils.decode(base64Audio),
          audioContext,
          24000,
          1
        );
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      }
    } catch (error) {
      console.error("Contextual TTS failed:", error);
      // 回退到普通播放
      this.speak(text, role.language);
    }
  },

  async speak(text: string, language: string = 'English'): Promise<void> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const voiceName = language === 'Chinese' ? 'Puck' : 'Kore';

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this naturally: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await audioUtils.decodeAudioData(
          audioUtils.decode(base64Audio),
          audioContext,
          24000,
          1
        );
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      }
    } catch (error) {
      console.error("TTS Playback failed:", error);
    }
  }
};
