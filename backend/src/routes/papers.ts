import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

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
    res.json({ success: true, message: '已删除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
