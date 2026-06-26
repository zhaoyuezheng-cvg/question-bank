import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

export const textbookRouter = Router();

// GET /api/textbooks - 获取教材目录列表
textbookRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { subject, grade } = req.query as Record<string, string>;
    const where: any = {};
    if (subject) where.subject = subject;
    if (grade) where.grade = grade;

    const books = await prisma.textbookCatalog.findMany({
      where,
      orderBy: [{ subject: 'asc' }, { grade: 'asc' }, { isDefault: 'desc' }],
    });

    const parsed = books.map(b => ({
      ...b,
      chapters: JSON.parse(b.chapters),
    }));

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/textbooks/:id - 获取单个教材目录
textbookRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const book = await prisma.textbookCatalog.findUnique({ where: { id: req.params.id } });
    if (!book) return res.status(404).json({ success: false, error: '教材目录不存在' });
    res.json({ success: true, data: { ...book, chapters: JSON.parse(book.chapters) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/textbooks - 创建教材目录
textbookRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, subject, grade, version, volume, chapters, isDefault } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: '名称不能为空' });

    const now = Math.floor(Date.now() / 1000);
    const book = await prisma.textbookCatalog.create({
      data: {
        id: uuid(),
        name: name.trim(),
        subject: subject || 'math',
        grade: grade || '七年级',
        version: version || '',
        volume: volume || '',
        chapters: JSON.stringify(chapters || []),
        isDefault: isDefault || false,
        createdAt: now,
        updatedAt: now,
      },
    });

    res.status(201).json({ success: true, data: { ...book, chapters: JSON.parse(book.chapters) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/textbooks/:id - 更新教材目录
textbookRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const now = Math.floor(Date.now() / 1000);
    const data: any = { updatedAt: now };

    if (body.name !== undefined) data.name = body.name;
    if (body.subject !== undefined) data.subject = body.subject;
    if (body.grade !== undefined) data.grade = body.grade;
    if (body.version !== undefined) data.version = body.version;
    if (body.volume !== undefined) data.volume = body.volume;
    if (body.chapters !== undefined) data.chapters = JSON.stringify(body.chapters);
    if (body.isDefault !== undefined) data.isDefault = body.isDefault;

    const book = await prisma.textbookCatalog.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: { ...book, chapters: JSON.parse(book.chapters) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/textbooks/:id
textbookRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.textbookCatalog.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: '已删除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/textbooks/import - 批量导入教材目录
textbookRouter.post('/import', async (req: Request, res: Response) => {
  try {
    const { catalogs } = req.body;
    if (!Array.isArray(catalogs)) return res.status(400).json({ success: false, error: '请提供 catalogs 数组' });

    const now = Math.floor(Date.now() / 1000);
    let success = 0;
    let skipped = 0;

    for (const c of catalogs) {
      if (!c.name || !c.chapters) { skipped++; continue; }

      const existing = await prisma.textbookCatalog.findFirst({ where: { name: c.name } });
      if (existing) {
        await prisma.textbookCatalog.update({
          where: { id: existing.id },
          data: { chapters: JSON.stringify(c.chapters), updatedAt: now },
        });
      } else {
        await prisma.textbookCatalog.create({
          data: {
            id: uuid(),
            name: c.name,
            subject: c.subject || 'math',
            grade: c.grade || '',
            version: c.version || '',
            volume: c.volume || '',
            chapters: JSON.stringify(c.chapters),
            isDefault: c.isDefault || false,
            createdAt: now,
            updatedAt: now,
          },
        });
      }
      success++;
    }

    res.json({ success: true, data: { success, skipped, total: catalogs.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/textbooks/seed - 预置鲁教版教材目录
textbookRouter.post('/seed', async (_req: Request, res: Response) => {
  try {
    const now = Math.floor(Date.now() / 1000);

    const math7 = {
      name: '鲁教版数学七年级',
      subject: 'math',
      grade: '七年级',
      version: '鲁教版',
      volume: '全册',
      chapters: [
        { name: '第一章 三角形', sections: ['认识三角形', '图形的全等', '探索三角形全等的条件', '三角形的尺规作图', '利用三角形全等测距离'] },
        { name: '第二章 轴对称', sections: ['轴对称现象', '探索轴对称的性质', '简单的轴对称图形', '利用轴对称进行设计'] },
        { name: '第三章 勾股定理', sections: ['探索勾股定理', '一定是直角三角形吗', '勾股定理的应用举例'] },
        { name: '第四章 实数', sections: ['无理数', '平方根', '立方根', '估算', '用计算器开方', '实数'] },
        { name: '第五章 位置与坐标', sections: ['确定位置', '平面直角坐标系', '轴对称与坐标变化'] },
        { name: '第六章 一次函数', sections: ['函数', '一次函数', '一次函数的图象', '确定一次函数的表达式', '一次函数的应用'] },
        { name: '第七章 二元一次方程组', sections: ['二元一次方程组', '解二元一次方程组', '二元一次方程组的应用', '二元一次方程与一次函数', '三元一次方程组'] },
        { name: '第八章 平行线的有关证明', sections: ['定义与命题', '证明的必要性', '基本事实与定理', '平行线的判定定理', '平行线的性质定理', '三角形内角和定理'] },
        { name: '第九章 概率初步', sections: ['感受可能性', '频率的稳定性', '等可能事件的概率'] },
        { name: '第十章 三角形的有关证明', sections: ['全等三角形', '等腰三角形', '直角三角形', '线段的垂直平分线', '角平分线'] },
        { name: '第十一章 一元一次不等式', sections: ['不等关系', '不等式的基本性质', '不等式的解集', '一元一次不等式', '一元一次不等式与一次函数', '一元一次不等式组'] },
      ],
    };

    const eng7 = {
      name: '鲁教版英语七年级',
      subject: 'english',
      grade: '七年级',
      version: '鲁教版',
      volume: '全册',
      chapters: [
        { name: '上册 Unit 1 Here and Now', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '上册 Unit 2 Rain or Shine', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '上册 Unit 3 A Day to Remember', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '上册 Unit 4 Once upon a Time', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '上册 Unit 5 Happy Holiday', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '上册 Unit 6 Home Sweet Home', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '上册 Unit 7 Avoid Danger, Keep Safe', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '下册 Unit 1 Do you want to watch a game show?', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '下册 Unit 2 I\'m going to study computer science.', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '下册 Unit 3 Will people have robots?', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '下册 Unit 4 How do you make a banana milk shake?', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '下册 Unit 5 Can you come to my party?', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '下册 Unit 6 If you go to the party, you\'ll have a great time!', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '下册 Unit 7 What\'s the matter?', sections: ['词汇', '语法', '阅读', '写作'] },
        { name: '下册 Unit 8 I\'ll help to clean up the city parks.', sections: ['词汇', '语法', '阅读', '写作'] },
      ],
    };

    for (const data of [math7, eng7]) {
      const existing = await prisma.textbookCatalog.findFirst({
        where: { name: data.name },
      });
      if (!existing) {
        await prisma.textbookCatalog.create({
          data: {
            id: uuid(),
            name: data.name,
            subject: data.subject,
            grade: data.grade,
            version: data.version,
            volume: data.volume,
            chapters: JSON.stringify(data.chapters),
            isDefault: true,
            createdAt: now,
            updatedAt: now,
          },
        });
      }
    }

    res.json({ success: true, message: '鲁教版七年级教材目录已预置' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
