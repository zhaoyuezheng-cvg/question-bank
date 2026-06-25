import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

export const flashcardRouter = Router();

// SM-2 Algorithm implementation
function sm2(quality: number, card: { easeFactor: number; interval: number; repetitions: number }) {
  // quality: 0-5 (0=complete blackout, 5=perfect response)
  let { easeFactor, interval, repetitions } = card;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions++;
  } else {
    // Incorrect response
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  return { easeFactor, interval, repetitions };
}

// GET /api/flashcards/due - 获取今日待复习的卡片
flashcardRouter.get('/due', async (req: Request, res: Response) => {
  try {
    const { subject, limit = '20' } = req.query as Record<string, string>;
    const now = Math.floor(Date.now() / 1000);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const where: any = { nextReview: { lte: now } };
    if (subject) where.question = { subject };

    const cards = await prisma.flashcard.findMany({
      where,
      take: limitNum,
      orderBy: { nextReview: 'asc' },
      include: { question: true },
    });

    const parsed = cards.map(c => ({
      ...c,
      question: {
        ...c.question,
        options: c.question.options ? JSON.parse(c.question.options) : undefined,
        tags: c.question.tags ? JSON.parse(c.question.tags) : [],
      },
    }));

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/flashcards/add - 添加题目到闪卡
flashcardRouter.post('/add', async (req: Request, res: Response) => {
  try {
    const { questionId } = req.body;
    if (!questionId) return res.status(400).json({ success: false, error: '缺少 questionId' });

    const now = Math.floor(Date.now() / 1000);
    const card = await prisma.flashcard.upsert({
      where: { questionId },
      update: {},
      create: {
        id: uuid(),
        questionId,
        nextReview: now,
        createdAt: now,
        updatedAt: now,
      },
    });

    res.json({ success: true, data: card });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/flashcards/:id/review - 复习卡片
flashcardRouter.post('/:id/review', async (req: Request, res: Response) => {
  try {
    const { quality } = req.body; // 0-5
    if (quality === undefined || quality < 0 || quality > 5) {
      return res.status(400).json({ success: false, error: 'quality 必须是 0-5 的数字' });
    }

    const card = await prisma.flashcard.findUnique({ where: { id: req.params.id } });
    if (!card) return res.status(404).json({ success: false, error: '卡片不存在' });

    const result = sm2(quality, card);
    const now = Math.floor(Date.now() / 1000);
    const nextReview = now + result.interval * 86400; // interval in days -> seconds

    const updated = await prisma.flashcard.update({
      where: { id: req.params.id },
      data: {
        easeFactor: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        nextReview,
        lastReview: now,
        updatedAt: now,
      },
    });

    res.json({ success: true, data: { ...updated, nextReviewDate: new Date(nextReview * 1000).toISOString().slice(0, 10) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/flashcards/:id - 移除闪卡
flashcardRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.flashcard.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '已移除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/flashcards/stats - 闪卡统计
flashcardRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const [total, due, mastered] = await Promise.all([
      prisma.flashcard.count(),
      prisma.flashcard.count({ where: { nextReview: { lte: now } } }),
      prisma.flashcard.count({ where: { interval: { gte: 21 } } }), // 21+ days = mastered
    ]);

    res.json({ success: true, data: { total, due, mastered, learning: total - mastered } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
