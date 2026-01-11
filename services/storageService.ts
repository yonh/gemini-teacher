
import { Session, Role, VocabularyWord, UserProgress, Language, KeyPoint, UserSettings, VoiceProvider, Course } from '../types';
import { STORAGE_KEYS, DEFAULT_ROLES } from '../constants';

export const storageService = {
  getSessions: (): Session[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return data ? JSON.parse(data) : [];
  },

  saveSession: (session: Session) => {
    const sessions = storageService.getSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex > -1) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  },

  getRoles: (): Role[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ROLES);
    return data ? JSON.parse(data) : DEFAULT_ROLES;
  },

  saveRole: (role: Role) => {
    const roles = storageService.getRoles();
    const existingIndex = roles.findIndex(r => r.id === role.id);
    if (existingIndex > -1) {
      roles[existingIndex] = role;
    } else {
      roles.push(role);
    }
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
  },

  getVocab: (): VocabularyWord[] => {
    const data = localStorage.getItem(STORAGE_KEYS.VOCAB);
    return data ? JSON.parse(data) : [];
  },

  saveVocabWord: (word: VocabularyWord) => {
    const vocab = storageService.getVocab();
    const existingIndex = vocab.findIndex(v => v.word.toLowerCase() === word.word.toLowerCase());
    if (existingIndex > -1) {
      vocab[existingIndex] = { ...vocab[existingIndex], ...word };
    } else {
      vocab.push(word);
    }
    localStorage.setItem(STORAGE_KEYS.VOCAB, JSON.stringify(vocab));
  },

  getKeyPoints: (): KeyPoint[] => {
    const data = localStorage.getItem(STORAGE_KEYS.KEY_POINTS);
    return data ? JSON.parse(data) : [];
  },

  saveKeyPoint: (kp: KeyPoint) => {
    const kps = storageService.getKeyPoints();
    const existingIndex = kps.findIndex(k => k.id === kp.id);
    if (existingIndex > -1) {
      kps[existingIndex] = kp;
    } else {
      kps.push(kp);
    }
    localStorage.setItem(STORAGE_KEYS.KEY_POINTS, JSON.stringify(kps));
  },

  deleteKeyPoint: (id: string) => {
    const kps = storageService.getKeyPoints();
    const filtered = kps.filter(k => k.id !== id);
    localStorage.setItem(STORAGE_KEYS.KEY_POINTS, JSON.stringify(filtered));
  },

  getCourses: (): Course[] => {
    const data = localStorage.getItem(STORAGE_KEYS.COURSES);
    return data ? JSON.parse(data) : [];
  },

  saveCourse: (course: Course) => {
    const courses = storageService.getCourses();
    const existingIndex = courses.findIndex(c => c.id === course.id);
    if (existingIndex > -1) {
      courses[existingIndex] = course;
    } else {
      courses.push(course);
    }
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  },

  deleteCourse: (id: string) => {
    const courses = storageService.getCourses();
    const filtered = courses.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(filtered));
  },

  toggleChapterCompletion: (courseId: string, chapterId: string) => {
    const courses = storageService.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    if (!course.completedChapterIds) course.completedChapterIds = [];
    
    const index = course.completedChapterIds.indexOf(chapterId);
    if (index > -1) {
      course.completedChapterIds.splice(index, 1);
    } else {
      course.completedChapterIds.push(chapterId);
    }
    storageService.saveCourse(course);
  },

  getSettings: (): UserSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const defaultSettings: UserSettings = {
      credentials: {},
      preferredTextProvider: VoiceProvider.GEMINI,
      preferredTextModel: "gemini-3-flash-preview",
      preferredRealtimeProvider: VoiceProvider.GEMINI,
      preferredRealtimeModel: "gemini-2.5-flash-native-audio-preview-12-2025"
    };
    return data ? JSON.parse(data) : defaultSettings;
  },

  getCredentials: (): Record<string, string> => {
    return storageService.getSettings().credentials;
  },

  saveSettings: (settings: Partial<UserSettings>) => {
    const current = storageService.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  },

  saveCredential: (provider: string, key: string) => {
    const settings = storageService.getSettings();
    settings.credentials[provider] = key;
    storageService.saveSettings(settings);
  },

  getProgress: (): UserProgress => {
    const sessions = storageService.getSessions();
    const dist: Record<Language, number> = {
      [Language.ENGLISH]: 0,
      [Language.CHINESE]: 0,
      [Language.JAPANESE]: 0
    };

    let totalSec = 0;
    sessions.forEach(s => {
      totalSec += s.duration;
      dist[s.language] += 1;
    });

    return {
      totalSeconds: totalSec,
      totalSessions: sessions.length,
      averageGrammarScore: 85,
      languageDistribution: dist
    };
  },

  exportAllData: () => {
    const allData = {
      sessions: storageService.getSessions(),
      roles: storageService.getRoles(),
      vocab: storageService.getVocab(),
      keyPoints: storageService.getKeyPoints(),
      settings: storageService.getSettings(),
      courses: storageService.getCourses()
    };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linguist_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
