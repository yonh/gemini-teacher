
import { GoogleGenAI, Type } from "@google/genai";
import { storageService } from "./storageService";
import { Course, Chapter, Language, DifficultyLevel, CourseCategory, CourseSource, VoiceProvider } from "../types";

export class CourseGenerationService {
  private ai: GoogleGenAI;

  constructor() {
    // API key must be obtained exclusively from the environment variable process.env.API_KEY.
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateCourse(
    topic: string, 
    options: { 
      language: Language, 
      level: DifficultyLevel, 
      category: CourseCategory,
      useSearch: boolean 
    }
  ): Promise<Course> {
    const prompt = `
      Create a comprehensive, structured language learning course for the topic: "${topic}".
      Target Language: ${options.language}
      Difficulty: ${options.level}
      Category: ${options.category}

      The output MUST be a valid JSON object matching the following structure:
      {
        "title": "Course Title",
        "description": "Short description of the course",
        "learningObjectives": ["objective 1", "objective 2"],
        "chapters": [
          {
            "title": "Chapter Title",
            "description": "What this chapter covers",
            "content": "Detailed educational content in Markdown, including vocabulary, grammar, and cultural notes.",
            "order": 1
          }
        ]
      }
      
      Generate at least 3 high-quality chapters. Each chapter should be substantive.
    `;

    const config: any = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          chapters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                content: { type: Type.STRING },
                order: { type: Type.NUMBER }
              },
              required: ["title", "description", "content", "order"]
            }
          }
        },
        required: ["title", "description", "learningObjectives", "chapters"]
      }
    };

    if (options.useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await this.ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: config
    });

    const result = JSON.parse(response.text || "{}");
    
    // Extract grounding URLs if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const references = groundingChunks
      ? groundingChunks
          .filter((c: any) => c.web)
          .map((c: any) => ({ title: c.web.title, uri: c.web.uri }))
      : [];

    const course: Course = {
      id: Date.now().toString(),
      title: result.title,
      description: result.description,
      difficulty: options.level,
      language: options.language,
      category: options.category,
      source: options.useSearch ? CourseSource.WEB_SEARCH : CourseSource.AI_GENERATED,
      learningObjectives: result.learningObjectives,
      chapters: result.chapters.map((ch: any, index: number) => ({
        ...ch,
        id: `ch-${Date.now()}-${index}`
      })),
      createdAt: new Date().toISOString(),
      references: references.length > 0 ? references : undefined
    };

    return course;
  }
}

export const courseGenerationService = new CourseGenerationService();
