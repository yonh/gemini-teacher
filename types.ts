
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

export interface Role {
  id: string;
  name: string;
  type: RoleType;
  language: Language;
  description: string;
  systemPrompt: string;
}

export interface VocabularyWord {
  id: string;
  word: string;
  translation: string;
  example: string;
  mastery: number; // 0 to 100
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
  duration: number; // in seconds
  language: Language;
  messages: ChatMessage[];
  corrections: Correction[];
  summary?: string;
}

export interface UserProgress {
  totalSeconds: number;
  totalSessions: number;
  averageGrammarScore: number;
  languageDistribution: Record<Language, number>;
}
