import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';

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

// GET /api/export/errors/word - 导出错题本为 Word 文档
exportRouter.get('/errors/word', async (req: Request, res: Response) => {
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
      return res.status(404).json({ success: false, error: '没有未掌握的错题' });
    }

    const subjectNames: Record<string, string> = {
      chinese: '语文', math: '数学', english: '英语', history: '历史',
      physics: '物理', chemistry: '化学', biology: '生物', geography: '地理', politics: '政治',
    };
    const typeNames: Record<string, string> = {
      choice: '单选题', multi_choice: '多选题', fill_blank: '填空题',
      short_answer: '简答题', essay: '论述题', true_false: '判断题',
    };

    const children: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: '📋 错题本复习', bold: true, size: 36 })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: `共 ${errors.length} 道错题 · ${new Date().toLocaleDateString('zh-CN')}`, size: 20, color: '666666' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    ];

    errors.forEach((e, i) => {
      const q = e.question;
      const options = q.options ? JSON.parse(q.options) : [];

      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${i + 1}. `, bold: true, size: 24 }),
          new TextRun({ text: `[${subjectNames[q.subject] || q.subject}] `, size: 18, color: '6366f1' }),
          new TextRun({ text: `[${typeNames[q.type] || q.type}] `, size: 18, color: '64748b' }),
          new TextRun({ text: `难度: ${'★'.repeat(q.difficulty)}${'☆'.repeat(5 - q.difficulty)}`, size: 18, color: 'f59e0b' }),
        ],
        spacing: { before: 300 },
      }));

      children.push(new Paragraph({
        children: [new TextRun({ text: q.content, size: 22 })],
        spacing: { before: 100 },
      }));

      if (options.length > 0) {
        options.forEach((o: string, j: number) => {
          children.push(new Paragraph({
            children: [new TextRun({ text: `    ${String.fromCharCode(65 + j)}. ${o}`, size: 20, color: '475569' })],
          }));
        });
      }

      children.push(new Paragraph({
        children: [new TextRun({ text: `❌ 我的答案：${e.wrongAnswer || '未作答'}`, size: 20, color: 'ef4444' })],
        spacing: { before: 100 },
      }));

      children.push(new Paragraph({
        children: [new TextRun({ text: `✅ 正确答案：${q.answer}`, size: 20, color: '10b981', bold: true })],
      }));

      if (q.analysis) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `💡 解析：${q.analysis}`, size: 20, color: '6366f1' })],
          spacing: { before: 100 },
        }));
      }

      if (e.errorNote) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `📝 ${e.errorNote}`, size: 18, color: '64748b', italics: true })],
        }));
      }

      children.push(new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' } },
      }));
    });

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="error_book_${new Date().toISOString().slice(0, 10)}.docx"`);
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/export/report/pdf - 学习报告 HTML（可打印为 PDF）
exportRouter.get('/report/pdf', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = '7' } = req.query as Record<string, string>;
    const daysNum = Math.min(90, Math.max(1, parseInt(days)));
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - daysNum * 86400;

    const records = await prisma.practiceRecord.findMany({
      where: { userId, createdAt: { gte: startTime } },
      orderBy: { createdAt: 'asc' },
    });

    const totalQuestions = records.length;
    const correctCount = records.filter(r => r.isCorrect).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const studyDays = new Set(records.map(r => new Date(r.createdAt * 1000).toISOString().slice(0, 10))).size;
    const avgPerDay = studyDays > 0 ? Math.round(totalQuestions / studyDays) : 0;

    const questions = await prisma.question.findMany({
      where: { id: { in: [...new Set(records.map(r => r.questionId))] } },
      select: { id: true, subject: true },
    });
    const qMap = new Map(questions.map(q => [q.id, q.subject]));
    const subjectStats: Record<string, { total: number; correct: number }> = {};
    for (const r of records) {
      const subj = qMap.get(r.questionId) || 'unknown';
      if (!subjectStats[subj]) subjectStats[subj] = { total: 0, correct: 0 };
      subjectStats[subj].total++;
      if (r.isCorrect) subjectStats[subj].correct++;
    }

    const [totalErrors, unresolvedErrors] = await Promise.all([
      prisma.errorBook.count({ where: { userId } }),
      prisma.errorBook.count({ where: { userId, isResolved: false } }),
    ]);

    const subjectNames: Record<string, string> = {
      chinese: '语文', math: '数学', english: '英语', history: '历史',
      physics: '物理', chemistry: '化学', biology: '生物', geography: '地理', politics: '政治',
    };

    const dailyStats: Record<string, { total: number; correct: number }> = {};
    for (const r of records) {
      const day = new Date(r.createdAt * 1000).toISOString().slice(0, 10);
      if (!dailyStats[day]) dailyStats[day] = { total: 0, correct: 0 };
      dailyStats[day].total++;
      if (r.isCorrect) dailyStats[day].correct++;
    }

    const subjectRows = Object.entries(subjectStats)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([s, v]) => `<tr><td>${subjectNames[s] || s}</td><td>${v.total}</td><td>${v.correct}</td><td>${Math.round((v.correct / v.total) * 100)}%</td></tr>`)
      .join('');

    const dailyRows = Object.entries(dailyStats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, v]) => `<tr><td>${d}</td><td>${v.total}</td><td>${v.correct}</td><td>${Math.round((v.correct / v.total) * 100)}%</td></tr>`)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>学习报告 - ${daysNum}天</title>
  <style>
    body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #1e293b; }
    h1 { text-align: center; font-size: 24px; }
    .meta { text-align: center; color: #666; margin-bottom: 24px; font-size: 13px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-card { text-align: center; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
    .stat-value { font-size: 28px; font-weight: 700; color: #6366f1; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    th { background: #f8fafc; font-weight: 600; }
    h2 { font-size: 18px; margin-top: 32px; margin-bottom: 12px; }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print" style="padding: 10px; background: #fef3c7; text-align: center; margin-bottom: 20px; border-radius: 8px;">
    💡 按 <kbd>Ctrl+P</kbd>（Mac: <kbd>⌘+P</kbd>）打印为 PDF
  </div>
  <h1>📊 学习报告</h1>
  <div class="meta">最近 ${daysNum} 天 · ${new Date().toLocaleDateString('zh-CN')}</div>
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-value">${totalQuestions}</div><div class="stat-label">总答题数</div></div>
    <div class="stat-card"><div class="stat-value">${studyDays}</div><div class="stat-label">学习天数</div></div>
    <div class="stat-card"><div class="stat-value">${accuracy}%</div><div class="stat-label">正确率</div></div>
    <div class="stat-card"><div class="stat-value">${avgPerDay}</div><div class="stat-label">日均答题</div></div>
  </div>
  <h2>📚 学科表现</h2>
  <table><thead><tr><th>学科</th><th>答题数</th><th>正确数</th><th>正确率</th></tr></thead><tbody>${subjectRows}</tbody></table>
  <h2>📅 每日趋势</h2>
  <table><thead><tr><th>日期</th><th>答题数</th><th>正确数</th><th>正确率</th></tr></thead><tbody>${dailyRows}</tbody></table>
  <h2>📋 错题概况</h2>
  <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
    <div class="stat-card"><div class="stat-value">${totalErrors}</div><div class="stat-label">累计错题</div></div>
    <div class="stat-card"><div class="stat-value">${unresolvedErrors}</div><div class="stat-label">未掌握</div></div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(500).send(`生成失败: ${err.message}`);
  }
});
