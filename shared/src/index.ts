// ==========================================
// 专属私人题库系统 - 共享类型定义
// ==========================================

// ---- 学科 ----
export type Subject = 'chinese' | 'math' | 'english' | 'history' | 'physics' | 'chemistry' | 'biology' | 'geography' | 'politics';

export const SUBJECT_LABELS: Record<Subject, string> = {
  chinese: '语文',
  math: '数学',
  english: '英语',
  history: '历史',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  geography: '地理',
  politics: '政治',
};

// ---- 题目类型 ----
export type QuestionType = 'choice' | 'multi_choice' | 'fill_blank' | 'short_answer' | 'essay' | 'true_false';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  choice: '单选题',
  multi_choice: '多选题',
  fill_blank: '填空题',
  short_answer: '简答题',
  essay: '论述题',
  true_false: '判断题',
};

// ---- 难度 ----
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: '基础',
  2: '较易',
  3: '中等',
  4: '较难',
  5: '困难',
};

// ---- 题目 ----
export interface Question {
  id: string;
  subject: Subject;
  category: string;         // 一级分类，如：古诗词、现代文
  subCategory: string;      // 二级细分，如：炼字、主旨概括
  type: QuestionType;
  difficulty: Difficulty;
  content: string;          // 题干（支持 Markdown/LaTeX 混排）
  options?: string[];       // 选择题选项
  answer: string;           // 标准答案
  analysis: string;         // 解析
  tags: string[];           // 自定义标签
  source?: string;          // 来源（如：2024全国卷）
  subType?: string;         // 阅读理解细分题型
  passageId?: string;       // 关联阅读材料ID
  createdAt: number;
  updatedAt: number;
}

// ---- 阅读材料 ----
export interface Passage {
  id: string;
  title: string;
  subject: Subject;
  category: string;
  subCategory: string;
  content: string;
  source?: string;
  tags?: string[];
  questions?: Question[];
  createdAt: number;
  updatedAt: number;
}

// ---- 试卷 ----
export interface ExamPaper {
  id: string;
  title: string;
  description?: string;
  subject: Subject;
  questionIds: string[];     // 题目ID数组，保证顺序
  totalScore?: number;
  layoutConfig: LayoutConfig;
  createdAt: number;
  updatedAt: number;
}

export interface LayoutConfig {
  showAnalysis: boolean;
  showAnswer: boolean;
  answerAreaLines: number;   // 每题答题横线行数
  fontSize: number;          // 正文字号 px
  headerText?: string;       // 试卷页眉
  footerText?: string;       // 试卷页脚
}

// ---- 标签 ----
export interface Tag {
  id: string;
  name: string;
  color?: string;
}

// ---- 分类树 ----
export interface CategoryNode {
  name: string;
  children?: CategoryNode[];
}

// ---- API 通用响应 ----
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---- 分页 ----
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---- 查询筛选 ----
export interface QuestionFilter {
  subject?: Subject;
  category?: string;
  subCategory?: string;
  type?: QuestionType;
  subType?: string;
  difficulty?: Difficulty;
  tags?: string[];
  keyword?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  passageId?: string;
}

// ---- 批量导入 ----
export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}
