import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

export const practiceRouter = Router();

// ---- 错题本 ----

// GET /api/practice/errors - 获取错题列表（按用户隔离）
practiceRouter.get('/errors', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { subject, isResolved, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const where: any = { userId };
    if (subject) where.question = { subject };
    if (isResolved !== undefined) where.isResolved = isResolved === 'true';

    const pageNum = Math.max(1, parseInt(page));
    const size = Math.min(100, Math.max(1, parseInt(pageSize)));

    const [items, total] = await Promise.all([
      prisma.errorBook.findMany({
        where,
        skip: (pageNum - 1) * size,
        take: size,
        orderBy: { updatedAt: 'desc' },
        include: { question: true },
      }),
      prisma.errorBook.count({ where }),
    ]);

    const parsed = items.map(e => ({
      ...e,
      question: {
        ...e.question,
        options: e.question.options ? JSON.parse(e.question.options) : undefined,
        tags: e.question.tags ? JSON.parse(e.question.tags) : [],
      },
    }));

    res.json({ success: true, data: { items: parsed, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/practice/errors - 加入错题本
practiceRouter.post('/errors', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { questionId, wrongAnswer, errorNote } = req.body;
    if (!questionId) return res.status(400).json({ success: false, error: '缺少 questionId' });

    const now = Math.floor(Date.now() / 1000);
    const item = await prisma.errorBook.upsert({
      where: { id: questionId + '_error' },
      update: { wrongAnswer, errorNote, updatedAt: now, isResolved: false },
      create: { id: uuid(), questionId, userId, wrongAnswer: wrongAnswer || '', errorNote, createdAt: now, updatedAt: now },
    });

    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/practice/errors/:id - 标记已掌握
practiceRouter.put('/errors/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const existing = await prisma.errorBook.findUnique({ where: { id: req.params.id } });
    if (!existing || (existing.userId && existing.userId !== userId)) {
      return res.status(403).json({ success: false, error: '无权操作' });
    }
    const { isResolved } = req.body;
    const item = await prisma.errorBook.update({
      where: { id: req.params.id },
      data: { isResolved, updatedAt: Math.floor(Date.now() / 1000) },
    });
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/practice/errors/:id
practiceRouter.delete('/errors/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const existing = await prisma.errorBook.findUnique({ where: { id: req.params.id } });
    if (!existing || (existing.userId && existing.userId !== userId)) {
      return res.status(403).json({ success: false, error: '无权操作' });
    }
    await prisma.errorBook.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '已移除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- 收藏夹 ----

// GET /api/practice/favorites（按用户隔离）
practiceRouter.get('/favorites', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { subject, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const where: any = { userId };
    if (subject) where.question = { subject };

    const pageNum = Math.max(1, parseInt(page));
    const size = Math.min(100, Math.max(1, parseInt(pageSize)));

    const [items, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        skip: (pageNum - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' },
        include: { question: true },
      }),
      prisma.favorite.count({ where }),
    ]);

    const parsed = items.map(f => ({
      ...f,
      question: {
        ...f.question,
        options: f.question.options ? JSON.parse(f.question.options) : undefined,
        tags: f.question.tags ? JSON.parse(f.question.tags) : [],
      },
    }));

    res.json({ success: true, data: { items: parsed, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/practice/favorites
practiceRouter.post('/favorites', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { questionId, note } = req.body;
    if (!questionId) return res.status(400).json({ success: false, error: '缺少 questionId' });

    const now = Math.floor(Date.now() / 1000);
    // 用 userId + questionId 查找已有收藏
    const existing = await prisma.favorite.findFirst({ where: { questionId, userId } });
    let item;
    if (existing) {
      item = await prisma.favorite.update({ where: { id: existing.id }, data: { note } });
    } else {
      item = await prisma.favorite.create({ data: { id: uuid(), questionId, userId, note, createdAt: now } });
    }
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/practice/favorites/:questionId
practiceRouter.delete('/favorites/:questionId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    await prisma.favorite.deleteMany({ where: { questionId: req.params.questionId, userId } });
    res.json({ success: true, message: '已取消收藏' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- 答题练习 ----

// POST /api/practice/submit - 提交答案
practiceRouter.post('/submit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { questionId, userAnswer, timeSpent } = req.body;
    if (!questionId || !userAnswer) return res.status(400).json({ success: false, error: '缺少参数' });

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) return res.status(404).json({ success: false, error: '题目不存在' });

    // 判断正误
    const correctAnswer = question.answer.trim().toUpperCase();
    const user = userAnswer.trim().toUpperCase();
    let isCorrect = false;

    if (['choice', 'multi_choice', 'true_false'].includes(question.type)) {
      isCorrect = user === correctAnswer;
    } else {
      const keywords = correctAnswer.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean);
      isCorrect = keywords.length > 0 && keywords.some(k => user.includes(k));
    }

    const now = Math.floor(Date.now() / 1000);
    const record = await prisma.practiceRecord.create({
      data: { id: uuid(), questionId, userId, userAnswer, isCorrect, timeSpent, createdAt: now },
    });

    // 答错自动加入错题本
    if (!isCorrect) {
      await prisma.errorBook.upsert({
        where: { id: questionId + '_error' },
        update: { wrongAnswer: userAnswer, updatedAt: now, isResolved: false },
        create: { id: uuid(), questionId, userId, wrongAnswer: userAnswer, createdAt: now, updatedAt: now },
      });
    }

    res.json({
      success: true,
      data: { isCorrect, correctAnswer: question.answer, analysis: question.analysis, recordId: record.id },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/practice/stats - 答题统计（按用户）
practiceRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userWhere = { userId };
    const [totalAnswered, correctCount, errorCount, favoriteCount] = await Promise.all([
      prisma.practiceRecord.count({ where: userWhere }),
      prisma.practiceRecord.count({ where: { ...userWhere, isCorrect: true } }),
      prisma.errorBook.count({ where: { ...userWhere, isResolved: false } }),
      prisma.favorite.count({ where: userWhere }),
    ]);

    res.json({
      success: true,
      data: {
        totalAnswered,
        correctCount,
        errorCount,
        favoriteCount,
        accuracy: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/practice/history - 答题历史（按用户）
practiceRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = '30' } = req.query as Record<string, string>;
    const daysNum = Math.min(365, Math.max(1, parseInt(days)));
    const now = Math.floor(Date.now() / 1000);
    const since = now - daysNum * 86400;

    const records = await prisma.practiceRecord.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

    const byDay: Record<string, { total: number; correct: number }> = {};
    for (const r of records) {
      const day = new Date(r.createdAt * 1000).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { total: 0, correct: 0 };
      byDay[day].total++;
      if (r.isCorrect) byDay[day].correct++;
    }

    const history = Object.entries(byDay).map(([date, d]) => ({
      date,
      total: d.total,
      correct: d.correct,
      accuracy: Math.round((d.correct / d.total) * 100),
    }));

    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/practice/random-paper - 随机组卷
practiceRouter.post('/random-paper', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { subject, count = 10, difficulty, types, errorOnly, category, subCategory, subType } = req.body;

    let questionIds: string[] | null = null;

    if (errorOnly) {
      const errorWhere: any = { isResolved: false, userId };
      if (subject) errorWhere.question = { subject };
      const errors = await prisma.errorBook.findMany({
        where: errorWhere,
        include: { question: true },
        take: count * 2,
      });
      questionIds = errors.map(e => e.questionId);
      if (questionIds.length === 0) {
        return res.json({ success: false, error: '没有错题可以练习' });
      }
    }

    const where: any = {};
    if (questionIds) {
      where.id = { in: questionIds };
    } else {
      if (subject) where.subject = subject;
      if (difficulty) where.difficulty = difficulty;
      if (types?.length) where.type = { in: types };
      if (category) where.category = category;
      if (subCategory) where.subCategory = subCategory;
      if (subType) where.subType = subType;
    }

    const total = await prisma.question.count({ where });
    if (total === 0) return res.json({ success: false, error: '没有符合条件的题目' });

    const takeCount = Math.min(count, total);
    const questions = await prisma.question.findMany({ where, take: takeCount * 3 });

    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    const picked = questions.slice(0, takeCount);

    const now = Math.floor(Date.now() / 1000);
    const label = subject ? `${subject}_随机` : '综合随机';
    const paper = await prisma.examPaper.create({
      data: {
        id: uuid(),
        title: `${label}练习 (${now})`,
        subject: subject || 'chinese',
        showAnalysis: false,
        showAnswer: false,
        answerAreaLines: 5,
        fontSize: 14,
        createdAt: now,
        updatedAt: now,
        questions: {
          create: picked.map((q, i) => ({
            id: uuid(),
            questionId: q.id,
            order: i + 1,
          })),
        },
      },
    });

    res.json({ success: true, data: { paperId: paper.id, count: picked.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
