import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

export const templateRouter = Router();

// GET /api/templates - 获取模板列表
templateRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { subject } = req.query as Record<string, string>;
    const where: any = {};
    if (subject) where.subject = subject;

    const templates = await prisma.paperTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    const parsed = templates.map(t => ({
      ...t,
      config: JSON.parse(t.config),
    }));

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/templates - 创建模板
templateRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, subject, config } = req.body;
    if (!name) return res.status(400).json({ success: false, error: '模板名称不能为空' });

    const now = Math.floor(Date.now() / 1000);
    const template = await prisma.paperTemplate.create({
      data: {
        id: uuid(),
        name,
        description: description || '',
        subject: subject || 'chinese',
        config: JSON.stringify(config || {}),
        createdAt: now,
        updatedAt: now,
      },
    });

    res.status(201).json({ success: true, data: { ...template, config: JSON.parse(template.config) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/templates/:id - 删除模板
templateRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.paperTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '已删除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
