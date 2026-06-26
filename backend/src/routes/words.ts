import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

export const wordRouter = Router();

// SM-2 for words
function sm2Word(quality: number, word: { mastery: number; reviewCount: number }) {
  let { mastery, reviewCount } = word;
  if (quality >= 3) {
    mastery = Math.min(5, mastery + 1);
    reviewCount++;
  } else {
    mastery = Math.max(0, mastery - 1);
    reviewCount = 0;
  }
  return { mastery, reviewCount };
}

// GET /api/words - 单词列表
wordRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { unit, mastery, keyword, page = '1', pageSize = '50', subject = 'english' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const size = Math.min(200, Math.max(1, parseInt(pageSize)));

    const where: any = { subject };
    if (unit) where.unit = unit;
    if (mastery !== undefined && mastery !== '') where.mastery = parseInt(mastery);
    if (keyword) {
      where.OR = [
        { word: { contains: keyword } },
        { meaning: { contains: keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.wordBook.findMany({ where, skip: (pageNum - 1) * size, take: size, orderBy: { updatedAt: 'desc' } }),
      prisma.wordBook.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/words/due - 待复习单词
wordRouter.get('/due', async (req: Request, res: Response) => {
  try {
    const { limit = '20', subject = 'english' } = req.query as Record<string, string>;
    const now = Math.floor(Date.now() / 1000);
    const words = await prisma.wordBook.findMany({
      where: { subject, nextReview: { lte: now }, mastery: { lt: 5 } },
      take: Math.min(100, parseInt(limit)),
      orderBy: { nextReview: 'asc' },
    });
    res.json({ success: true, data: words });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/words/stats - 单词统计
wordRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const { subject = 'english' } = req.query as Record<string, string>;
    const now = Math.floor(Date.now() / 1000);
    const [total, mastered, due, byUnit] = await Promise.all([
      prisma.wordBook.count({ where: { subject } }),
      prisma.wordBook.count({ where: { subject, mastery: { gte: 4 } } }),
      prisma.wordBook.count({ where: { subject, nextReview: { lte: now }, mastery: { lt: 5 } } }),
      prisma.wordBook.groupBy({ by: ['unit'], _count: true, where: { subject } }),
    ]);
    res.json({ success: true, data: { total, mastered, due, learning: total - mastered, byUnit } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/words/units - 获取所有单元
wordRouter.get('/units', async (req: Request, res: Response) => {
  try {
    const { subject = 'english' } = req.query as Record<string, string>;
    const units = await prisma.wordBook.findMany({
      where: { subject, unit: { not: null } },
      select: { unit: true },
      distinct: ['unit'],
      orderBy: { unit: 'asc' },
    });
    res.json({ success: true, data: units.map(u => u.unit).filter(Boolean) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/words - 添加单词
wordRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { word, phonetic, meaning, partOfSpeech, example, unit, subject = 'english' } = req.body;
    if (!word?.trim() || !meaning?.trim()) return res.status(400).json({ success: false, error: '单词和释义不能为空' });

    const now = Math.floor(Date.now() / 1000);
    const existing = await prisma.wordBook.findUnique({ where: { word_subject: { word: word.trim().toLowerCase(), subject } } });

    if (existing) {
      return res.json({ success: true, data: existing, message: '单词已存在' });
    }

    const w = await prisma.wordBook.create({
      data: {
        id: uuid(),
        word: word.trim().toLowerCase(),
        phonetic: phonetic || null,
        meaning: meaning.trim(),
        partOfSpeech: partOfSpeech || null,
        example: example || null,
        unit: unit || null,
        subject,
        nextReview: now,
        createdAt: now,
        updatedAt: now,
      },
    });
    res.status(201).json({ success: true, data: w });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/words/batch - 批量添加单词
wordRouter.post('/batch', async (req: Request, res: Response) => {
  try {
    const { words, unit, subject = 'english' } = req.body;
    if (!Array.isArray(words)) return res.status(400).json({ success: false, error: '请提供 words 数组' });

    const now = Math.floor(Date.now() / 1000);
    let success = 0;
    let skipped = 0;

    for (const w of words) {
      if (!w.word || !w.meaning) { skipped++; continue; }
      try {
        await prisma.wordBook.upsert({
          where: { word_subject: { word: w.word.trim().toLowerCase(), subject } },
          update: { meaning: w.meaning.trim(), phonetic: w.phonetic || null, updatedAt: now },
          create: {
            id: uuid(),
            word: w.word.trim().toLowerCase(),
            phonetic: w.phonetic || null,
            meaning: w.meaning.trim(),
            partOfSpeech: w.partOfSpeech || null,
            example: w.example || null,
            unit: unit || w.unit || null,
            subject,
            nextReview: now,
            createdAt: now,
            updatedAt: now,
          },
        });
        success++;
      } catch { skipped++; }
    }

    res.json({ success: true, data: { success, skipped, total: words.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/words/:id/review - 复习单词
wordRouter.post('/:id/review', async (req: Request, res: Response) => {
  try {
    const { quality } = req.body; // 0-5
    const word = await prisma.wordBook.findUnique({ where: { id: req.params.id } });
    if (!word) return res.status(404).json({ success: false, error: '单词不存在' });

    const result = sm2Word(quality, word);
    const now = Math.floor(Date.now() / 1000);
    // Interval based on mastery: 0→1d, 1→2d, 2→4d, 3→7d, 4→14d, 5→30d
    const intervals = [1, 2, 4, 7, 14, 30];
    const interval = intervals[Math.min(result.mastery, 5)] * 86400;

    const updated = await prisma.wordBook.update({
      where: { id: req.params.id },
      data: {
        mastery: result.mastery,
        reviewCount: result.reviewCount,
        nextReview: now + interval,
        updatedAt: now,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/words/:id
wordRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.wordBook.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '已删除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
