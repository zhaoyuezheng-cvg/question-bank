import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

export const tagRouter = Router();

// GET /api/tags
tagRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: tags });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tags
tagRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    const tag = await prisma.tag.create({ data: { id: uuid(), name, color } });
    res.status(201).json({ success: true, data: tag });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/tags/:id
tagRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.tag.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '已删除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
