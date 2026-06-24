import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

export const categoryRouter = Router();

// GET /api/categories?subject=math
categoryRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { subject } = req.query as Record<string, string>;
    const where: any = {};
    if (subject) where.subject = subject;

    const cats = await prisma.category.findMany({ where, orderBy: { name: 'asc' } });

    // Build tree
    const map = new Map<string, any>();
    const roots: any[] = [];
    for (const c of cats) {
      map.set(c.id, { id: c.id, name: c.name, subject: c.subject, children: [] });
    }
    for (const c of cats) {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    res.json({ success: true, data: roots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/categories
categoryRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { subject, name, parentId } = req.body;
    const cat = await prisma.category.create({
      data: { id: uuid(), subject, name, parentId: parentId || null },
    });
    res.status(201).json({ success: true, data: cat });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/categories/:id
categoryRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '已删除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
