import { Router, Request, Response } from 'express';
import prisma from '../prisma';

export const exportRouter = Router();

// GET /api/export/anki?subject=xxx - 导出 Anki 格式 (TSV)
exportRouter.get('/anki', async (req: Request, res: Response) => {
  try {
    const { subject, category, type, limit = '500' } = req.query as Record<string, string>;
    const where: any = {};
    if (subject) where.subject = subject;
    if (category) where.category = category;
    if (type) where.type = type;

    const questions = await prisma.question.findMany({
      where,
      take: Math.min(2000, Math.max(1, parseInt(limit))),
      orderBy: { updatedAt: 'desc' },
    });

    // Anki TSV format: front\tback
    // Front = question content + options
    // Back = answer + analysis
    const lines = questions.map(q => {
      let front = q.content;
      if (q.options) {
        const opts = JSON.parse(q.options);
        front += '\n' + opts.map((o: string, i: number) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n');
      }
      let back = `答案：${q.answer}`;
      if (q.analysis) back += `\n\n解析：${q.analysis}`;
      // Escape tabs and newlines for TSV
      front = front.replace(/\t/g, ' ').replace(/\n/g, '<br>');
      back = back.replace(/\t/g, ' ').replace(/\n/g, '<br>');
      return `${front}\t${back}`;
    });

    const tsv = lines.join('\n');
    res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="anki_export_${new Date().toISOString().slice(0, 10)}.tsv"`);
    res.send('\uFEFF' + tsv); // BOM for Excel compatibility
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/export/error-book-pdf - 导出错题本为可打印 HTML
exportRouter.get('/error-book-pdf', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { subject } = req.query as Record<string, string>;

    const where: any = { userId, isResolved: false };
    if (subject) where.question = { subject };

    const errors = await prisma.errorBook.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { question: true },
      take: 200,
    });

    if (errors.length === 0) {
      return res.status(404).send('没有未掌握的错题');
    }

    let questionHtml = '';
    errors.forEach((e, i) => {
      const q = e.question;
      const options = q.options ? JSON.parse(q.options) : [];
      questionHtml += `
        <div class="question">
          <div class="q-header">
            <span class="q-num">${i + 1}.</span>
            <span class="q-tag">${q.subject}</span>
            <span class="q-tag">${q.category}</span>
          </div>
          <div class="q-content">${q.content}</div>
          ${options.length ? `<div class="q-options">${options.map((o: string, j: number) => `<div>${String.fromCharCode(65 + j)}. ${o}</div>`).join('')}</div>` : ''}
          <div class="q-wrong">我的答案：${e.wrongAnswer || '未作答'}</div>
          <div class="q-answer">正确答案：${q.answer}</div>
          ${q.analysis ? `<div class="q-analysis">解析：${q.analysis}</div>` : ''}
          ${e.errorNote ? `<div class="q-note">📝 ${e.errorNote}</div>` : ''}
        </div>`;
    });

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>错题本复习</title>
  <style>
    body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; font-size: 22px; }
    .meta { text-align: center; color: #666; margin-bottom: 24px; font-size: 13px; }
    .question { page-break-inside: avoid; margin-bottom: 24px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .q-header { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; font-size: 12px; }
    .q-num { font-weight: 700; font-size: 16px; }
    .q-tag { background: #f1f5f9; padding: 2px 8px; border-radius: 10px; color: #64748b; }
    .q-content { font-size: 15px; line-height: 1.8; margin-bottom: 8px; }
    .q-options { font-size: 14px; color: #475569; margin-bottom: 8px; padding-left: 16px; }
    .q-wrong { color: #ef4444; font-size: 13px; margin: 4px 0; }
    .q-answer { color: #10b981; font-size: 13px; margin: 4px 0; font-weight: 600; }
    .q-analysis { color: #6366f1; font-size: 13px; margin: 4px 0; padding: 8px; background: #eef2ff; border-radius: 6px; }
    .q-note { color: #64748b; font-size: 12px; margin: 4px 0; font-style: italic; }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print" style="padding: 10px; background: #fef3c7; text-align: center; margin-bottom: 20px; border-radius: 8px;">
    💡 按 <kbd>Ctrl+P</kbd>（Mac: <kbd>⌘+P</kbd>）打印为 PDF
  </div>
  <h1>📋 错题本复习</h1>
  <div class="meta">共 ${errors.length} 道错题 · ${new Date().toLocaleDateString('zh-CN')}</div>
  ${questionHtml}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(500).send(`生成失败: ${err.message}`);
  }
});
