import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

export const passageRouter = Router();

// GET /api/passages - 查询阅读材料列表
passageRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { subject, category, subCategory, keyword, page = '1', pageSize = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const size = Math.min(100, Math.max(1, parseInt(pageSize)));

    const where: any = {};
    if (subject) where.subject = subject;
    if (category) where.category = category;
    if (subCategory) where.subCategory = subCategory;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { content: { contains: keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.passage.findMany({
        where,
        skip: (pageNum - 1) * size,
        take: size,
        orderBy: { updatedAt: 'desc' },
        include: {
          questions: {
            select: { id: true, type: true, difficulty: true, content: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.passage.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/passages/:id - 获取阅读材料详情（含子题）
passageRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const passage = await prisma.passage.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!passage) return res.status(404).json({ success: false, error: '阅读材料不存在' });

    // Parse JSON fields for questions
    const parsed = {
      ...passage,
      tags: passage.tags ? JSON.parse(passage.tags) : [],
      questions: passage.questions.map(q => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : undefined,
        tags: q.tags ? JSON.parse(q.tags) : [],
      })),
    };

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/passages - 创建阅读材料
passageRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, subject, category, subCategory, content, source, tags } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, error: '标题不能为空' });
    if (!content?.trim()) return res.status(400).json({ success: false, error: '文章内容不能为空' });

    const now = Math.floor(Date.now() / 1000);
    const passage = await prisma.passage.create({
      data: {
        id: uuid(),
        title: title.trim(),
        subject: subject || 'chinese',
        category: category || '',
        subCategory: subCategory || '',
        content: content.trim(),
        source: source || null,
        tags: tags ? JSON.stringify(tags) : null,
        createdAt: now,
        updatedAt: now,
      },
    });

    res.status(201).json({ success: true, data: passage });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/passages/:id - 更新阅读材料
passageRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const now = Math.floor(Date.now() / 1000);

    const data: any = { updatedAt: now };
    if (body.title !== undefined) data.title = body.title;
    if (body.subject !== undefined) data.subject = body.subject;
    if (body.category !== undefined) data.category = body.category;
    if (body.subCategory !== undefined) data.subCategory = body.subCategory;
    if (body.content !== undefined) data.content = body.content;
    if (body.source !== undefined) data.source = body.source;
    if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);

    const passage = await prisma.passage.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: passage });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/passages/:id - 删除阅读材料（不影响已关联的题目）
passageRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Unlink questions first
    await prisma.question.updateMany({
      where: { passageId: req.params.id },
      data: { passageId: null },
    });
    await prisma.passage.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '已删除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/passages/:id/questions - 将题目关联到阅读材料
passageRouter.post('/:id/questions', async (req: Request, res: Response) => {
  try {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds)) return res.status(400).json({ success: false, error: 'questionIds 必须是数组' });

    const passage = await prisma.passage.findUnique({ where: { id: req.params.id } });
    if (!passage) return res.status(404).json({ success: false, error: '阅读材料不存在' });

    await prisma.question.updateMany({
      where: { id: { in: questionIds } },
      data: { passageId: req.params.id },
    });

    res.json({ success: true, data: { linked: questionIds.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/passages/:id/questions/:questionId - 取消关联
passageRouter.delete('/:id/questions/:questionId', async (req: Request, res: Response) => {
  try {
    await prisma.question.update({
      where: { id: req.params.questionId },
      data: { passageId: null },
    });
    res.json({ success: true, message: '已取消关联' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/passages/categories/tree - 获取阅读材料分类树
passageRouter.get('/categories/tree', async (_req: Request, res: Response) => {
  try {
    // Return predefined reading comprehension categories
    const tree = {
      chinese: {
        label: '语文',
        children: [
          {
            name: '现代文阅读', children: [
              { name: '小说阅读' },
              { name: '散文阅读' },
              { name: '说明文阅读' },
              { name: '议论文阅读' },
              { name: '非连续性文本阅读' },
            ],
          },
          {
            name: '古诗文阅读', children: [
              { name: '文言文阅读' },
              { name: '古诗词鉴赏' },
            ],
          },
          { name: '名著阅读' },
          { name: '语言文字运用' },
        ],
      },
      english: {
        label: '英语',
        children: [
          {
            name: '阅读理解', children: [
              { name: '细节理解' },
              { name: '主旨大意' },
              { name: '推理判断' },
              { name: '词义猜测' },
              { name: '指代关系' },
            ],
          },
          { name: '完形填空' },
          { name: '任务型阅读' },
          { name: '阅读表达' },
        ],
      },
      math: {
        label: '数学',
        children: [
          { name: '阅读理解题' },
          { name: '材料分析题' },
          { name: '探究题' },
        ],
      },
      physics: { label: '物理', children: [{ name: '实验探究题' }, { name: '材料分析题' }] },
      chemistry: { label: '化学', children: [{ name: '实验探究题' }, { name: '材料分析题' }] },
      biology: { label: '生物', children: [{ name: '实验探究题' }, { name: '材料分析题' }] },
      history: { label: '历史', children: [{ name: '材料分析题' }, { name: '论述题' }] },
      politics: { label: '政治', children: [{ name: '材料分析题' }, { name: '论述题' }] },
      geography: { label: '地理', children: [{ name: '材料分析题' }, { name: '综合题' }] },
    };

    res.json({ success: true, data: tree });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
