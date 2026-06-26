import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';
import { auditLog } from '../utils/audit';

export const paperRouter = Router();

// GET /api/papers
paperRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { subject, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page || '1'));
    const size = Math.min(100, Math.max(1, parseInt(pageSize || '20')));

    const where: any = {};
    if (subject) where.subject = subject;

    const [items, total] = await Promise.all([
      prisma.examPaper.findMany({
        where,
        skip: (pageNum - 1) * size,
        take: size,
        orderBy: { updatedAt: 'desc' },
        include: { questions: { orderBy: { order: 'asc' }, include: { question: true } } },
      }),
      prisma.examPaper.count({ where }),
    ]);

    const parsed = items.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      subject: p.subject,
      totalScore: p.totalScore,
      layoutConfig: {
        showAnalysis: p.showAnalysis,
        showAnswer: p.showAnswer,
        answerAreaLines: p.answerAreaLines,
        fontSize: p.fontSize,
        headerText: p.headerText,
        footerText: p.footerText,
      },
      questions: p.questions.map(pq => ({
        ...pq.question,
        options: pq.question.options ? JSON.parse(pq.question.options) : undefined,
        tags: pq.question.tags ? JSON.parse(pq.question.tags) : [],
        order: pq.order,
        score: pq.score,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    res.json({
      success: true,
      data: { items: parsed, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/papers/:id
paperRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const p = await prisma.examPaper.findUnique({
      where: { id: req.params.id },
      include: { questions: { orderBy: { order: 'asc' }, include: { question: true } } },
    });
    if (!p) return res.status(404).json({ success: false, error: '试卷不存在' });

    res.json({
      success: true,
      data: {
        id: p.id,
        title: p.title,
        description: p.description,
        subject: p.subject,
        totalScore: p.totalScore,
        layoutConfig: {
          showAnalysis: p.showAnalysis,
          showAnswer: p.showAnswer,
          answerAreaLines: p.answerAreaLines,
          fontSize: p.fontSize,
          headerText: p.headerText,
          footerText: p.footerText,
        },
        questions: p.questions.map(pq => ({
          ...pq.question,
          options: pq.question.options ? JSON.parse(pq.question.options) : undefined,
          tags: pq.question.tags ? JSON.parse(pq.question.tags) : [],
          order: pq.order,
          score: pq.score,
        })),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/papers
paperRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const now = Math.floor(Date.now() / 1000);
    const id = body.id || uuid();
    const lc = body.layoutConfig || {};

    const paper = await prisma.examPaper.create({
      data: {
        id,
        title: body.title,
        description: body.description || null,
        subject: body.subject,
        totalScore: body.totalScore || null,
        showAnalysis: lc.showAnalysis ?? true,
        showAnswer: lc.showAnswer ?? false,
        answerAreaLines: lc.answerAreaLines ?? 5,
        fontSize: lc.fontSize ?? 14,
        headerText: lc.headerText || null,
        footerText: lc.footerText || null,
        createdAt: now,
        updatedAt: now,
        questions: {
          create: (body.questionIds || []).map((qid: string, idx: number) => ({
            id: uuid(),
            questionId: qid,
            order: idx + 1,
          })),
        },
      },
      include: { questions: true },
    });

    res.status(201).json({ success: true, data: paper });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/papers/:id
paperRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const now = Math.floor(Date.now() / 1000);
    const lc = body.layoutConfig || {};

    // If questionIds provided, replace all questions
    if (body.questionIds) {
      await prisma.paperQuestion.deleteMany({ where: { paperId: req.params.id } });
      await prisma.paperQuestion.createMany({
        data: body.questionIds.map((qid: string, idx: number) => ({
          id: uuid(),
          paperId: req.params.id,
          questionId: qid,
          order: idx + 1,
        })),
      });
    }

    const paper = await prisma.examPaper.update({
      where: { id: req.params.id },
      data: {
        title: body.title,
        description: body.description,
        subject: body.subject,
        totalScore: body.totalScore,
        showAnalysis: lc.showAnalysis,
        showAnswer: lc.showAnswer,
        answerAreaLines: lc.answerAreaLines,
        fontSize: lc.fontSize,
        headerText: lc.headerText,
        footerText: lc.footerText,
        updatedAt: now,
      },
    });

    res.json({ success: true, data: paper });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/papers/:id
paperRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.examPaper.delete({ where: { id: req.params.id } });
    await auditLog({ userId: (req as any).userId, action: 'delete', target: 'paper', targetId: req.params.id, ip: req.ip });
    res.json({ success: true, message: '已删除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/papers/:id/print - 打印页面（可保存为 PDF）
paperRouter.get('/:id/print', async (req: Request, res: Response) => {
  try {
    const paper = await prisma.examPaper.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { question: true },
        },
      },
    });
    if (!paper) return res.status(404).send('试卷不存在');

    const fontSize = paper.fontSize || 14;
    const showAnswer = req.query.answer === 'true';
    const showAnalysis = req.query.analysis === 'true';

    const typeLabels: Record<string, string> = {
      choice: '选择题', multi_choice: '多选题', fill_blank: '填空题',
      short_answer: '简答题', essay: '论述题', true_false: '判断题',
    };

    const questionHtml = paper.questions.map((pq, i) => {
      const q = pq.question;
      const options = q.options ? JSON.parse(q.options) : null;
      let html = `<div class="question">`;
      html += `<div class="q-header"><span class="q-num">${i + 1}.</span>`;
      html += `<span class="q-type">[${typeLabels[q.type] || q.type}]</span>`;
      if (pq.score) html += `<span class="q-score">（${pq.score}分）</span>`;
      html += `</div>`;
      html += `<div class="q-content">${q.content}</div>`;
      if (options && ['choice', 'multi_choice'].includes(q.type)) {
        html += `<div class="q-options">`;
        const labels = 'ABCDEFGH';
        options.forEach((opt: string, j: number) => {
          html += `<div class="option"><span class="opt-label">${labels[j]}.</span> ${opt}</div>`;
        });
        html += `</div>`;
      }
      if (q.type === 'fill_blank' || q.type === 'short_answer' || q.type === 'essay') {
        const lines = q.type === 'essay' ? (paper.answerAreaLines || 5) * 2 : paper.answerAreaLines || 5;
        html += `<div class="answer-area">${'<div class="answer-line"></div>'.repeat(lines)}</div>`;
      }
      if (showAnswer) {
        html += `<div class="q-answer"><strong>答案：</strong>${q.answer}</div>`;
      }
      if (showAnalysis && q.analysis) {
        html += `<div class="q-analysis"><strong>解析：</strong>${q.analysis}</div>`;
      }
      html += `</div>`;
      return html;
    }).join('\n');

    const totalScore = paper.questions.reduce((sum, pq) => sum + (pq.score || 0), 0);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${paper.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'SimSun', 'Songti SC', serif; font-size: ${fontSize}px; line-height: 1.8; padding: 20px 40px; color: #000; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #000; padding-bottom: 16px; }
    .header h1 { font-size: ${fontSize + 6}px; margin-bottom: 8px; }
    .header .meta { font-size: ${fontSize - 2}px; color: #333; }
    .question { margin-bottom: 20px; page-break-inside: avoid; }
    .q-header { font-weight: bold; margin-bottom: 4px; }
    .q-num { margin-right: 4px; }
    .q-type { font-weight: normal; color: #666; font-size: ${fontSize - 2}px; margin-right: 8px; }
    .q-score { font-weight: normal; color: #666; font-size: ${fontSize - 2}px; }
    .q-content { margin-bottom: 8px; white-space: pre-wrap; }
    .q-options { padding-left: 24px; margin-bottom: 8px; }
    .option { margin-bottom: 4px; }
    .opt-label { font-weight: bold; margin-right: 4px; }
    .answer-area { border-bottom: 1px dashed #ccc; min-height: 24px; margin: 8px 0; }
    .answer-line { border-bottom: 1px dashed #ddd; height: 24px; }
    .q-answer { background: #f0f9ff; padding: 8px 12px; margin: 8px 0; border-left: 3px solid #3b82f6; font-size: ${fontSize - 1}px; }
    .q-analysis { background: #f0fdf4; padding: 8px 12px; margin: 8px 0; border-left: 3px solid #22c55e; font-size: ${fontSize - 1}px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="padding: 10px; background: #fef3c7; text-align: center; margin-bottom: 20px; border-radius: 8px;">
    💡 按 <kbd>Ctrl+P</kbd>（Mac: <kbd>⌘+P</kbd>）打印为 PDF
  </div>
  <div class="header">
    <h1>${paper.title}</h1>
    <div class="meta">
      ${paper.description ? `<p>${paper.description}</p>` : ''}
      ${totalScore > 0 ? `<p>总分：${totalScore}分</p>` : ''}
      <p>共 ${paper.questions.length} 题</p>
    </div>
  </div>
  ${questionHtml}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(500).send(`生成打印页面失败: ${err.message}`);
  }
});
