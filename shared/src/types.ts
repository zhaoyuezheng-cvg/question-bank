// 共享类型定义

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QuestionData {
  id: string;
  subject: string;
  category: string;
  subCategory: string;
  type: string;
  subType?: string | null;
  difficulty: number;
  content: string;
  options?: string[] | null;
  answer: string;
  analysis: string;
  tags?: string[] | null;
  source?: string | null;
  passageId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ExamPaperData {
  id: string;
  title: string;
  description?: string | null;
  subject: string;
  totalScore?: number | null;
  showAnalysis: boolean;
  showAnswer: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ErrorBookData {
  id: string;
  questionId: string;
  userId?: string | null;
  wrongAnswer: string;
  errorNote?: string | null;
  isResolved: boolean;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: number;
  lastReview?: number | null;
  createdAt: number;
  updatedAt: number;
  question?: QuestionData;
}

export interface FlashcardData {
  id: string;
  questionId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: number;
  lastReview?: number | null;
  createdAt: number;
  updatedAt: number;
  question?: QuestionData;
}

export interface PracticeRecordData {
  id: string;
  questionId: string;
  userId?: string | null;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent?: number | null;
  createdAt: number;
}

export interface UserData {
  id: string;
  username: string;
  role: string;
  createdAt: number;
}

export interface OperationLogData {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  detail?: string | null;
  createdAt: number;
}

export interface StudyReportData {
  period: { days: number; from: string; to: string };
  summary: {
    totalAnswered: number;
    totalCorrect: number;
    accuracy: number;
    studyDays: number;
    newErrors: number;
    resolvedErrors: number;
    avgPerDay: number;
  };
  subjectStats: { subject: string; total: number; correct: number; accuracy: number }[];
  difficultyStats: { difficulty: number; total: number; correct: number; accuracy: number }[];
  trend: { date: string; total: number; correct: number; accuracy: number }[];
}

export interface ExamComparisonData {
  sessions: { id: string; date: string; score: number; totalScore: number; accuracy: number; timeUsed: number }[];
  questionStats: { order: number; questionId: string; content: string; type: string; difficulty: number; correctRate: number; totalAttempted: number }[];
}

export interface WordData {
  id: string;
  word: string;
  phonetic?: string | null;
  meaning: string;
  partOfSpeech?: string | null;
  example?: string | null;
  unit?: string | null;
  subject: string;
  mastery: number;
  nextReview: number;
  reviewCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface StudyPlanData {
  id: string;
  date: string;
  subject: string;
  targetCount: number;
  doneCount: number;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export interface PassageData {
  id: string;
  title: string;
  subject: string;
  category: string;
  subCategory: string;
  content: string;
  source?: string | null;
  tags?: string[] | null;
  createdAt: number;
  updatedAt: number;
}

export interface TextbookData {
  id: string;
  name: string;
  subject: string;
  grade: string;
  version: string;
  volume: string;
  chapters: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FavoriteData {
  id: string;
  questionId: string;
  userId?: string | null;
  note?: string | null;
  createdAt: number;
  question?: QuestionData;
}

export interface QuestionRelationData {
  id: string;
  questionId: string;
  relatedId: string;
  relationType: string;
}

export interface QuestionNoteData {
  id: string;
  questionId: string;
  userId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuditLogData {
  id: string;
  userId?: string | null;
  action: string;
  target: string;
  targetId?: string | null;
  detail?: string | null;
  ip?: string | null;
  createdAt: number;
  user?: { id: string; username: string; role: string };
}

export interface DashboardStats {
  totalQuestions: number;
  totalPapers: number;
  totalAnswered: number;
  accuracy: number;
  todayAnswered: number;
  todayNewQuestions: number;
  weekAnswered: number;
  errorDue: number;
  flashcardDue: number;
}

export interface ReviewCalendarDay {
  date: string;
  count: number;
  level: number;
}
