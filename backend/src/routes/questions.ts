import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';
import { auditLog } from '../utils/audit';
import { searchQuestions, isFTSAvailable, refreshFTS } from '../utils/fts';
import { logOperation } from '../utils/operation-log';

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
      if (isFTSAvailable()) {
        const ftsIds = await searchQuestions(keyword as string, size * 5);
        if (ftsIds.length > 0) {
          where.id = { in: ftsIds };
        } else {
          // FTS no results, fallback to LIKE
          where.OR = [
            { content: { contains: keyword } },
            { answer: { contains: keyword } },
          ];
        }
      } else {
        where.OR = [
          { content: { contains: keyword } },
          { answer: { contains: keyword } },
          { analysis: { contains: keyword } },
        ];
      }
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
    refreshFTS(); // 刷新搜索索引
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/questions/:id
questionRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const now = Math.floor(Date.now() / 1000);

    // 保存版本历史
    const before = await prisma.question.findUnique({ where: { id: req.params.id } });
    if (before) {
      await prisma.questionVersion.create({
        data: {
          id: uuid(),
          questionId: before.id,
          data: JSON.stringify(before),
          changedBy: (req as any).userId,
          changedAt: now,
        },
      }).catch(() => {}); // 忽略版本记录失败
    }

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
    refreshFTS();
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

    // 保存题目数据用于撤销
    const questionData = await prisma.question.findUnique({ where: { id } });
    await prisma.question.delete({ where: { id } });
    refreshFTS();
    await auditLog({ userId: (req as any).userId, action: 'delete', target: 'question', targetId: id, ip: req.ip });
    await logOperation({
      userId: (req as any).userId,
      action: 'delete_question',
      targetType: 'question',
      targetId: id,
      detail: JSON.stringify({ before: questionData }),
    });
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
      // 批量检查关联数据（5 次查询覆盖所有 ID，而非 N×5 次）
      const [peCounts, erCounts, faCounts, flCounts, prCounts] = await Promise.all([
        prisma.paperQuestion.groupBy({ by: ['questionId'], where: { questionId: { in: ids } }, _count: true }),
        prisma.errorBook.groupBy({ by: ['questionId'], where: { questionId: { in: ids } }, _count: true }),
        prisma.favorite.groupBy({ by: ['questionId'], where: { questionId: { in: ids } }, _count: true }),
        prisma.flashcard.groupBy({ by: ['questionId'], where: { questionId: { in: ids } }, _count: true }).catch(() => []),
        prisma.practiceRecord.groupBy({ by: ['questionId'], where: { questionId: { in: ids } }, _count: true }),
      ]);
      const countMap: Record<string, number> = {};
      for (const r of peCounts) countMap[r.questionId] = (countMap[r.questionId] || 0) + r._count;
      for (const r of erCounts) countMap[r.questionId] = (countMap[r.questionId] || 0) + r._count;
      for (const r of faCounts) countMap[r.questionId] = (countMap[r.questionId] || 0) + r._count;
      for (const r of flCounts) countMap[r.questionId] = (countMap[r.questionId] || 0) + r._count;
      for (const r of prCounts) countMap[r.questionId] = (countMap[r.questionId] || 0) + r._count;
      const issues = Object.entries(countMap)
        .filter(([, count]) => count > 0)
        .map(([id, count]) => ({ id, count }));
      if (issues.length > 0) {
        return res.json({
          success: false,
          error: `${issues.length} 道题目有关联数据，确认删除？`,
          data: { issues, needConfirm: true },
        });
      }
    }

    const result = await prisma.question.deleteMany({ where: { id: { in: ids } } });
    refreshFTS();
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

// ---- 操作历史 ----

// GET /api/questions/operations/history - 获取操作历史
questionRouter.get('/operations/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { limit = '50' } = req.query as Record<string, string>;
    const logs = await prisma.operationLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, parseInt(limit))),
    });
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/questions/operations/undo/:logId - 撤销操作
questionRouter.post('/operations/undo/:logId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const log = await prisma.operationLog.findUnique({ where: { id: req.params.logId } });
    if (!log || log.userId !== userId) {
      return res.status(403).json({ success: false, error: '无权操作' });
    }

    if (log.action === 'delete_question' && log.detail) {
      const { before } = JSON.parse(log.detail);
      if (before) {
        const now = Math.floor(Date.now() / 1000);
        await prisma.question.create({
          data: {
            id: before.id,
            subject: before.subject,
            category: before.category,
            subCategory: before.subCategory,
            type: before.type,
            subType: before.subType,
            difficulty: before.difficulty,
            content: before.content,
            options: before.options,
            answer: before.answer,
            analysis: before.analysis || '',
            tags: before.tags,
            source: before.source,
            passageId: before.passageId,
            createdAt: before.createdAt || now,
            updatedAt: now,
          },
        });
        refreshFTS();
        // 删除操作日志
        await prisma.operationLog.delete({ where: { id: log.id } });
        return res.json({ success: true, message: '已恢复题目' });
      }
    }

    res.json({ success: false, error: '该操作不支持撤销' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- 题目关联 ----

// GET /api/questions/:id/relations - 获取关联题目
questionRouter.get('/:id/relations', async (req: Request, res: Response) => {
  try {
    const relations = await prisma.questionRelation.findMany({
      where: { OR: [{ questionId: req.params.id }, { relatedId: req.params.id }] },
    });
    const relatedIds = relations.map(r => r.questionId === req.params.id ? r.relatedId : r.questionId);
    if (relatedIds.length === 0) return res.json({ success: true, data: [] });

    const questions = await prisma.question.findMany({ where: { id: { in: relatedIds } } });
    const parsed = questions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : undefined,
      tags: q.tags ? JSON.parse(q.tags) : [],
      relationType: relations.find(r => r.questionId === q.id || r.relatedId === q.id)?.relationType,
    }));
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/questions/:id/relations - 添加关联
questionRouter.post('/:id/relations', async (req: Request, res: Response) => {
  try {
    const { relatedId, relationType = 'similar' } = req.body;
    if (!relatedId) return res.status(400).json({ success: false, error: '缺少 relatedId' });
    if (relatedId === req.params.id) return res.status(400).json({ success: false, error: '不能关联自己' });

    const now = Math.floor(Date.now() / 1000);
    const relation = await prisma.questionRelation.upsert({
      where: { questionId_relatedId: { questionId: req.params.id, relatedId } },
      update: { relationType },
      create: { id: uuid(), questionId: req.params.id, relatedId, relationType },
    });
    res.json({ success: true, data: relation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/questions/:id/relations/:relatedId - 删除关联
questionRouter.delete('/:id/relations/:relatedId', async (req: Request, res: Response) => {
  try {
    await prisma.questionRelation.deleteMany({
      where: {
        OR: [
          { questionId: req.params.id, relatedId: req.params.relatedId },
          { questionId: req.params.relatedId, relatedId: req.params.id },
        ],
      },
    });
    res.json({ success: true, message: '已删除关联' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/questions/:id/versions - 获取题目版本历史
questionRouter.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const versions = await prisma.questionVersion.findMany({
      where: { questionId: req.params.id },
      orderBy: { changedAt: 'desc' },
      take: 20,
    });
    const parsed = versions.map(v => ({
      ...v,
      data: JSON.parse(v.data),
    }));
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/questions/auto-relate - 自动建立关联（同分类+同知识点）
questionRouter.post('/auto-relate', async (req: Request, res: Response) => {
  try {
    const questions = await prisma.question.findMany({
      select: { id: true, subject: true, category: true, subCategory: true, tags: true },
    });

    let created = 0;
    const existing = await prisma.questionRelation.findMany({ select: { questionId: true, relatedId: true } });
    const existingSet = new Set(existing.map(r => `${r.questionId}:${r.relatedId}`));

    // Group by subject+category+subCategory
    const groups: Record<string, typeof questions> = {};
    for (const q of questions) {
      const key = `${q.subject}:${q.category}:${q.subCategory}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    }

    for (const group of Object.values(groups)) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i], b = group[j];
          const key1 = `${a.id}:${b.id}`;
          const key2 = `${b.id}:${a.id}`;
          if (existingSet.has(key1) || existingSet.has(key2)) continue;
          await prisma.questionRelation.create({
            data: { id: uuid(), questionId: a.id, relatedId: b.id, relationType: 'same_knowledge' },
          });
          existingSet.add(key1);
          created++;
        }
      }
    }

    res.json({ success: true, data: { created } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


