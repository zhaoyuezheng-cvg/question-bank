import type { Subject, QuestionType, Difficulty } from 'shared/src/index';

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
