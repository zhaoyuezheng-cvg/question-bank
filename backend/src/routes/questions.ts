import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';
import { auditLog } from '../utils/audit';

export const questionRouter = Router();

// GET /api/questions - 查询列表（支持筛选 + 分页）
questionRouter.get('/', async (req: Request, res: Response) => {
  try {
    const {
      subject, category, subCategory, type, subType, difficulty,
      tags, keyword, page = '1', pageSize = '20', sortBy, passageId
    } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, parseInt(page || '1'));
    const size = Math.min(100, Math.max(1, parseInt(pageSize || '20')));

    // Build where clause
    const where: any = {};
    if (subject) where.subject = subject;
    if (category) where.category = category;
    if (subCategory) where.subCategory = subCategory;
    if (type) where.type = type;
    if (subType) where.subType = subType;
    if (passageId) where.passageId = passageId;
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

    // Build orderBy
    let orderBy: any = { updatedAt: 'desc' };
    if (sortBy === 'createdAt') orderBy = { createdAt: 'desc' };
    else if (sortBy === 'difficulty_asc') orderBy = { difficulty: 'asc' };
    else if (sortBy === 'difficulty_desc') orderBy = { difficulty: 'desc' };

    const [items, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip: (pageNum - 1) * size,
        take: size,
        orderBy,
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
        subType: body.subType || null,
        passageId: body.passageId || null,
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
    const allowed = ['subject', 'category', 'subCategory', 'type', 'subType', 'difficulty', 'content', 'answer', 'analysis', 'source', 'passageId'];
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

// DELETE /api/questions/:id（关联检查）
questionRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    // 检查关联数据
    const [paperItems, errorItems, favorites, flashcards, records] = await Promise.all([
      prisma.paperQuestion.count({ where: { questionId: id } }),
      prisma.errorBook.count({ where: { questionId: id } }),
      prisma.favorite.count({ where: { questionId: id } }),
      prisma.flashcard.count({ where: { questionId: id } }).catch(() => 0),
      prisma.practiceRecord.count({ where: { questionId: id } }),
    ]);
    const related = { paperItems, errorItems, favorites, flashcards, records };
    const totalRelated = paperItems + errorItems + favorites + flashcards + records;

    if (totalRelated > 0 && req.query.force !== 'true') {
      return res.json({
        success: false,
        error: `该题目有 ${totalRelated } 条关联数据（试卷引用: ${paperItems}，错题: ${errorItems}，收藏: ${favorites}，闪卡: ${flashcards}，答题记录: ${records}）`,
        data: { related, needConfirm: true },
      });
    }

    await prisma.question.delete({ where: { id } });
    await auditLog({ userId: (req as any).userId, action: 'delete', target: 'question', targetId: id, ip: req.ip });
    res.json({ success: true, message: '已删除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/questions/batch-delete（关联检查）
questionRouter.post('/batch-delete', async (req: Request, res: Response) => {
  try {
    const { ids, force } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'ids 必须是数组' });

    if (!force) {
      // 检查每个题目的关联
      const issues: { id: string; count: number }[] = [];
      for (const id of ids) {
        const [pe, er, fa, fl, pr] = await Promise.all([
          prisma.paperQuestion.count({ where: { questionId: id } }),
          prisma.errorBook.count({ where: { questionId: id } }),
          prisma.favorite.count({ where: { questionId: id } }),
          prisma.flashcard.count({ where: { questionId: id } }).catch(() => 0),
          prisma.practiceRecord.count({ where: { questionId: id } }),
        ]);
        const total = pe + er + fa + fl + pr;
        if (total > 0) issues.push({ id, count: total });
      }
      if (issues.length > 0) {
        return res.json({
          success: false,
          error: `${issues.length} 道题目有关联数据，确认删除？`,
          data: { issues, needConfirm: true },
        });
      }
    }

    const result = await prisma.question.deleteMany({ where: { id: { in: ids } } });
    await auditLog({ userId: (req as any).userId, action: 'batch_delete', target: 'question', detail: `删除 ${result.count} 道题`, ip: req.ip });
    res.json({ success: true, data: { deleted: result.count } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/questions/batch-update
questionRouter.post('/batch-update', async (req: Request, res: Response) => {
  try {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'ids 必须是数组' });
    if (!updates || typeof updates !== 'object') return res.status(400).json({ success: false, error: '缺少 updates' });

    const allowed = ['subject', 'category', 'subCategory', 'type', 'difficulty', 'source'];
    const data: any = { updatedAt: Math.floor(Date.now() / 1000) };
    for (const f of allowed) {
      if (updates[f] !== undefined && updates[f] !== '' && updates[f] !== 0) data[f] = updates[f];
    }

    const result = await prisma.question.updateMany({ where: { id: { in: ids } }, data });
    res.json({ success: true, data: { updated: result.count } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


