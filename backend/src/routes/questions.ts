import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

export const questionRouter = Router();

// GET /api/questions - 查询列表（支持筛选 + 分页）
questionRouter.get('/', async (req: Request, res: Response) => {
  try {
    const {
      subject, category, subCategory, type, difficulty,
      tags, keyword, page = '1', pageSize = '20'
    } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, parseInt(page || '1'));
    const size = Math.min(100, Math.max(1, parseInt(pageSize || '20')));

    // Build where clause
    const where: any = {};
    if (subject) where.subject = subject;
    if (category) where.category = category;
    if (subCategory) where.subCategory = subCategory;
    if (type) where.type = type;
    if (difficulty) where.difficulty = parseInt(difficulty as string);
    if (keyword) {
      where.OR = [
        { content: { contains: keyword } },
        { answer: { contains: keyword } },
        { analysis: { contains: keyword } },
      ];
    }
    if (tags) {
      const tagList = (tags as string).split(',');
      // SQLite JSON contains check
      where.AND = tagList.map(t => ({
        tags: { contains: t.trim() }
      }));
    }

    const [items, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip: (pageNum - 1) * size,
        take: size,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.question.count({ where }),
    ]);

    // Parse JSON fields
    const parsed = items.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : undefined,
      tags: q.tags ? JSON.parse(q.tags) : [],
    }));

    res.json({
      success: true,
      data: {
        items: parsed,
        total,
        page: pageNum,
        pageSize: size,
        totalPages: Math.ceil(total / size),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/questions/stats/summary - 统计概览（必须在 /:id 之前注册）
questionRouter.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const [total, bySubject, byType, byDifficulty] = await Promise.all([
      prisma.question.count(),
      prisma.question.groupBy({ by: ['subject'], _count: true }),
      prisma.question.groupBy({ by: ['type'], _count: true }),
      prisma.question.groupBy({ by: ['difficulty'], _count: true }),
    ]);

    res.json({
      success: true,
      data: { total, bySubject, byType, byDifficulty },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/questions/:id
questionRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const q = await prisma.question.findUnique({ where: { id: req.params.id } });
    if (!q) return res.status(404).json({ success: false, error: '题目不存在' });
    res.json({
      success: true,
      data: {
        ...q,
        options: q.options ? JSON.parse(q.options) : undefined,
        tags: q.tags ? JSON.parse(q.tags) : [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/questions
questionRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Input validation
    if (!body.content?.trim()) return res.status(400).json({ success: false, error: '题干不能为空' });
    if (!body.answer?.trim()) return res.status(400).json({ success: false, error: '答案不能为空' });
    const validSubjects = ['chinese', 'math', 'english', 'history', 'physics', 'chemistry', 'biology', 'geography', 'politics'];
    if (!validSubjects.includes(body.subject)) return res.status(400).json({ success: false, error: '学科无效' });
    const validTypes = ['choice', 'multi_choice', 'fill_blank', 'short_answer', 'essay', 'true_false'];
    if (!validTypes.includes(body.type)) return res.status(400).json({ success: false, error: '题型无效' });
    if (body.difficulty < 1 || body.difficulty > 5) return res.status(400).json({ success: false, error: '难度范围 1-5' });

    const now = Math.floor(Date.now() / 1000);
    const id = body.id || uuid();

    const q = await prisma.question.create({
      data: {
        id,
        subject: body.subject,
        category: body.category,
        subCategory: body.subCategory,
        type: body.type,
        difficulty: body.difficulty,
        content: body.content,
        options: body.options ? JSON.stringify(body.options) : null,
        answer: body.answer,
        analysis: body.analysis || '',
        tags: body.tags ? JSON.stringify(body.tags) : null,
        source: body.source || null,
        createdAt: now,
        updatedAt: now,
      },
    });

    res.status(201).json({ success: true, data: q });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/questions/:id
questionRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const now = Math.floor(Date.now() / 1000);

    // Whitelist allowed fields
    const allowed = ['subject', 'category', 'subCategory', 'type', 'difficulty', 'content', 'answer', 'analysis', 'source'];
    const data: any = {};
    for (const f of allowed) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.options !== undefined) data.options = JSON.stringify(body.options);
    if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);
    data.updatedAt = now;

    const q = await prisma.question.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: q });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/questions/:id
questionRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '已删除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/questions/batch-delete
questionRouter.post('/batch-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'ids 必须是数组' });

    const result = await prisma.question.deleteMany({ where: { id: { in: ids } } });
    res.json({ success: true, data: { deleted: result.count } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


