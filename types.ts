
export enum Language {
  ENGLISH = 'English',
  CHINESE = 'Chinese',
  JAPANESE = 'Japanese'
}

export enum RoleType {
  COACH = 'Coach',
  INTERVIEWER = 'Interviewer',
  FRIEND = 'Friend',
  EXAMINER = 'Examiner'
}

export enum VoiceProvider {
  GEMINI = 'Gemini Live',
  OPENAI = 'OpenAI Realtime',
  OPENROUTER = 'OpenRouter',
  ZHIPU_GLM = '智谱 GLM-Realtime'
}

export enum DifficultyLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate', 
  ADVANCED = 'Advanced',
  NATIVE = 'Native'
}

export enum CourseCategory {
  BUSINESS = 'Business',
  DAILY_LIFE = 'Daily Life',
  ACADEMIC = 'Academic',
  TRAVEL = 'Travel',
  EXAM_PREP = 'Exam Preparation',
  TECHNICAL = 'Technical'
}

export enum CourseSource {
  WEB_SEARCH = 'Web Search',
  AI_GENERATED = 'AI Generated',
  USER_CREATED = 'User Created'
}

export interface Role {
  id: string;
  name: string;
  type: RoleType;
  language: Language;
  description: string;
  systemPrompt: string;
  provider: VoiceProvider;
}

export interface VocabularyWord {
  id: string;
  word: string;
  translation: string;
  example: string;
  mastery: number;
  lastReviewed: string;
}

export interface KeyPoint {
  id: string;
  sessionId: string;
  roleName: string;
  content: string;
  translation?: string;
  timestamp: string;
  note?: string;
}

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  translation?: string;
  timestamp: string;
  isPinned?: boolean;
}

export interface Session {
  id: string;
  roleId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  language: Language;
  messages: ChatMessage[];
  corrections: Correction[];
  summary?: string;
  courseContext?: {
    courseId: string;
    chapterId: string;
  };
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  content: string; // Markdown or plain text
  order: number;
  associatedRoleId?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  language: Language;
  category: CourseCategory;
  source: CourseSource;
  chapters: Chapter[];
  learningObjectives: string[];
  createdAt: string;
  references?: { title: string, uri: string }[];
  completedChapterIds?: string[];
}

export interface UserProgress {
  totalSeconds: number;
  totalSessions: number;
  averageGrammarScore: number;
  languageDistribution: Record<Language, number>;
}

export interface UserSettings {
  credentials: Record<string, string>;
  preferredTextProvider: VoiceProvider;
  preferredTextModel: string;
  preferredRealtimeProvider: VoiceProvider;
  preferredRealtimeModel: string;
}
