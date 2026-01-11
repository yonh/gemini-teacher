
import { GoogleGenAI } from "@google/genai";
import { OpenRouterService } from "./openRouterService";
import { storageService } from "./storageService";
import { VoiceProvider } from "../types";

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

    // Default to Gemini, using process.env.API_KEY directly.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text || "";
  }
};
