import { getSubjectLabel, getTypeLabel, getDifficultyLabel } from './constants';
import type { Subject, QuestionType, Difficulty } from 'shared/src/index';

// Export questions to CSV
export function exportQuestionsCSV(questions: any[], filename = '题目导出') {
  const headers = ['学科', '题型', '难度', '一级分类', '二级分类', '题干', '选项', '答案', '解析', '标签', '来源'];
  const rows = questions.map(q => [
    getSubjectLabel(q.subject as Subject),
    getTypeLabel(q.type as QuestionType),
    getDifficultyLabel(q.difficulty as Difficulty),
    q.category || '',
    q.subCategory || '',
    q.content.replace(/\n/g, ' '),
    (q.options || []).join(' | '),
    q.answer.replace(/\n/g, ' '),
    (q.analysis || '').replace(/\n/g, ' '),
    (q.tags || []).join(', '),
    q.source || '',
  ]);

  const csv = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// Export questions to Word-compatible HTML
export function exportQuestionsWord(questions: any[], filename = '题目导出') {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'SimSun', serif; font-size: 14px; line-height: 1.8; }
  .question { margin-bottom: 20px; page-break-inside: avoid; }
  .q-num { font-weight: bold; margin-right: 4px; }
  .q-type { color: #666; font-size: 12px; }
  .q-content { margin: 8px 0; }
  .q-options { padding-left: 24px; margin: 8px 0; }
  .q-answer { color: #16a34a; margin: 4px 0; }
  .q-analysis { color: #4f46e5; font-size: 13px; margin: 4px 0; }
  .q-meta { color: #999; font-size: 12px; }
</style>
</head>
<body>
<h1>题目导出</h1>
${questions.map((q, i) => `
<div class="question">
  <span class="q-num">${i + 1}.</span>
  <span class="q-type">[${getTypeLabel(q.type as QuestionType)}]</span>
  <span class="q-meta">${getSubjectLabel(q.subject as Subject)} · ${q.category || ''} · ${getDifficultyLabel(q.difficulty as Difficulty)}</span>
  <div class="q-content">${q.content.replace(/\n/g, '<br>')}</div>
  ${q.options?.length ? `<div class="q-options">${q.options.map((o: string, j: number) => `${String.fromCharCode(65 + j)}. ${o}`).join('<br>')}</div>` : ''}
  <div class="q-answer"><strong>【答案】</strong>${q.answer.replace(/\n/g, '<br>')}</div>
  ${q.analysis ? `<div class="q-analysis"><strong>【解析】</strong>${q.analysis.replace(/\n/g, '<br>')}</div>` : ''}
</div>
`).join('')}
</body>
</html>`;

  downloadFile(html, `${filename}.doc`, 'application/msword');
}

// Export to JSON
export function exportQuestionsJSON(questions: any[], filename = '题目导出') {
  const json = JSON.stringify(questions, null, 2);
  downloadFile(json, `${filename}.json`, 'application/json');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\ufeff' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
