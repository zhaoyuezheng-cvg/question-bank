import type { Subject, QuestionType, Difficulty } from 'shared/src/index';

// 阅读理解细分题型
export const READING_SUB_TYPES: Record<string, { label: string; subjects?: string[] }> = {
  // 语文阅读理解
  '概括内容': { label: '概括文章内容', subjects: ['chinese'] },
  '赏析句子': { label: '赏析句子', subjects: ['chinese'] },
  '分析标题': { label: '分析标题含义', subjects: ['chinese'] },
  '分析人物': { label: '分析人物形象', subjects: ['chinese'] },
  '环境描写': { label: '环境描写作用', subjects: ['chinese'] },
  '情节梳理': { label: '情节梳理', subjects: ['chinese'] },
  '主旨探究': { label: '主旨探究', subjects: ['chinese'] },
  '语言赏析': { label: '语言特色赏析', subjects: ['chinese'] },
  '情感体悟': { label: '情感体悟', subjects: ['chinese'] },
  '词语理解': { label: '词语/句子含义', subjects: ['chinese'] },
  '开放题': { label: '开放性试题', subjects: ['chinese'] },
  '实词虚词': { label: '实词虚词解释', subjects: ['chinese'] },
  '翻译句子': { label: '翻译句子', subjects: ['chinese'] },
  '断句': { label: '断句', subjects: ['chinese'] },
  '文言理解': { label: '文言文内容理解', subjects: ['chinese'] },
  '意象分析': { label: '意象分析', subjects: ['chinese'] },
  '手法赏析': { label: '表现手法赏析', subjects: ['chinese'] },
  '古诗情感': { label: '古诗情感把握', subjects: ['chinese'] },
  // 英语阅读理解
  'Detail': { label: '细节理解 (Detail)', subjects: ['english'] },
  'MainIdea': { label: '主旨大意 (Main Idea)', subjects: ['english'] },
  'Inference': { label: '推理判断 (Inference)', subjects: ['english'] },
  'Vocabulary': { label: '词义猜测 (Vocabulary)', subjects: ['english'] },
  'Reference': { label: '指代关系 (Reference)', subjects: ['english'] },
  'Attitude': { label: '观点态度 (Attitude)', subjects: ['english'] },
  'Title': { label: '标题归纳 (Title)', subjects: ['english'] },
  // 通用
  '实验探究': { label: '实验探究', subjects: ['physics', 'chemistry', 'biology'] },
  '材料分析': { label: '材料分析', subjects: ['history', 'politics', 'geography'] },
  '图表分析': { label: '图表分析', subjects: ['math', 'physics', 'chemistry', 'biology', 'geography'] },
  '论述题': { label: '论述题', subjects: ['history', 'politics'] },
};

export function getSubTypeLabel(st: string): string {
  return READING_SUB_TYPES[st]?.label || st;
}

export function getSubTypesForSubject(subject: string): string[] {
  return Object.entries(READING_SUB_TYPES)
    .filter(([, v]) => !v.subjects || v.subjects.includes(subject))
    .map(([k]) => k);
}

export const SUBJECT_LABELS: Record<Subject, string> = {
  chinese: '语文', math: '数学', english: '英语', history: '历史',
  physics: '物理', chemistry: '化学', biology: '生物', geography: '地理', politics: '政治',
};

export const SUBJECT_COLORS: Record<Subject, string> = {
  chinese: '#e74c3c', math: '#3498db', english: '#2ecc71', history: '#f39c12',
  physics: '#9b59b6', chemistry: '#1abc9c', biology: '#27ae60', geography: '#e67e22', politics: '#34495e',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  choice: '单选题', multi_choice: '多选题', fill_blank: '填空题',
  short_answer: '简答题', essay: '论述题', true_false: '判断题',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: '基础', 2: '较易', 3: '中等', 4: '较难', 5: '困难',
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  1: '#52c41a', 2: '#73d13d', 3: '#faad14', 4: '#ff7a45', 5: '#ff4d4f',
};

export function getSubjectLabel(s: Subject): string {
  return SUBJECT_LABELS[s] || s;
}

export function getTypeLabel(t: QuestionType): string {
  return QUESTION_TYPE_LABELS[t] || t;
}

export function getDifficultyLabel(d: Difficulty): string {
  return DIFFICULTY_LABELS[d] || `${d}`;
}
