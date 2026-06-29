import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

export const studyRouter = Router();

// ---- 学习计划 ----

// GET /api/study/plan?date=2026-06-26 - 获取某日计划
studyRouter.get('/plan', async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const plans = await prisma.studyPlan.findMany({
      where: { date },
      orderBy: { subject: 'asc' },
    });
    res.json({ success: true, data: plans });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/study/plan - 创建/更新计划
studyRouter.post('/plan', async (req: Request, res: Response) => {
  try {
    const { date, subject, targetCount } = req.body;
    if (!date || !subject) return res.status(400).json({ success: false, error: '缺少日期或学科' });

    const now = Math.floor(Date.now() / 1000);
    const plan = await prisma.studyPlan.upsert({
      where: { date_subject: { date, subject } },
      update: { targetCount: targetCount || 10, updatedAt: now },
      create: {
        id: uuid(),
        date,
        subject,
        targetCount: targetCount || 10,
        createdAt: now,
        updatedAt: now,
      },
    });
    res.json({ success: true, data: plan });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/study/plan/:id/done - 标记完成
studyRouter.post('/plan/:id/done', async (req: Request, res: Response) => {
  try {
    const plan = await prisma.studyPlan.update({
      where: { id: req.params.id },
      data: { status: 'done', doneCount: req.body.doneCount || 0, updatedAt: Math.floor(Date.now() / 1000) },
    });
    res.json({ success: true, data: plan });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/study/checkin - 打卡记录（最近30天）
studyRouter.get('/checkin', async (_req: Request, res: Response) => {
  try {
    const checkins = await prisma.studyCheckin.findMany({
      orderBy: { date: 'desc' },
      take: 60,
    });
    res.json({ success: true, data: checkins });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/study/checkin - 每日打卡
studyRouter.post('/checkin', async (req: Request, res: Response) => {
  try {
    const date = req.body.date || new Date().toISOString().slice(0, 10);
    const totalDone = req.body.totalDone || 0;

    // Calculate streak
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const ydStr = yesterday.toISOString().slice(0, 10);
    const prevCheckin = await prisma.studyCheckin.findUnique({ where: { date: ydStr } });
    const streak = prevCheckin ? prevCheckin.streak + 1 : 1;

    const now = Math.floor(Date.now() / 1000);
    const checkin = await prisma.studyCheckin.upsert({
      where: { date },
      update: { totalDone, streak },
      create: { id: uuid(), date, totalDone, streak, createdAt: now },
    });

    res.json({ success: true, data: checkin });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- 错题间隔复习 ----

// GET /api/study/error-review - 获取今日待复习错题
studyRouter.get('/error-review', async (req: Request, res: Response) => {
  try {
    const { subject, limit = '10' } = req.query as Record<string, string>;
    const now = Math.floor(Date.now() / 1000);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    // Find errors that are due for review (using flashcard-like scheduling)
    const where: any = { isResolved: false };
    if (subject) where.question = { subject };

    const errors = await prisma.errorBook.findMany({
      where,
      include: { question: true },
      orderBy: { updatedAt: 'asc' },
      take: limitNum,
    });

    const parsed = errors.map(e => ({
      ...e,
      question: {
        ...e.question,
        options: e.question.options ? JSON.parse(e.question.options) : undefined,
        tags: e.question.tags ? JSON.parse(e.question.tags) : [],
      },
      // Calculate next review based on error count
      daysSinceError: Math.floor((now - e.updatedAt) / 86400),
    }));

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/study/error-review/:id - 复习错题
studyRouter.post('/error-review/:id', async (req: Request, res: Response) => {
  try {
    const { isCorrect } = req.body;
    const now = Math.floor(Date.now() / 1000);

    if (isCorrect) {
      // Mark as resolved
      await prisma.errorBook.update({
        where: { id: req.params.id },
        data: { isResolved: true, updatedAt: now },
      });
    } else {
      // Still wrong, update timestamp for re-review
      await prisma.errorBook.update({
        where: { id: req.params.id },
        data: { updatedAt: now },
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- 自动组卷 ----

// POST /api/study/auto-paper - 自动组卷
studyRouter.post('/auto-paper', async (req: Request, res: Response) => {
  try {
    const { subject, category, subCategory, subType, difficulty, count = 10, title } = req.body;

    const where: any = {};
    if (subject) where.subject = subject;
    if (category) where.category = category;
    if (subCategory) where.subCategory = subCategory;
    if (subType) where.subType = subType;
    if (difficulty) where.difficulty = difficulty;

    const total = await prisma.question.count({ where });
    if (total === 0) return res.json({ success: false, error: '没有符合条件的题目' });

    const takeCount = Math.min(count, total);
    const questions = await prisma.question.findMany({ where, take: takeCount * 3 });

    // Fisher-Yates shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    const picked = questions.slice(0, takeCount);

    const now = Math.floor(Date.now() / 1000);
    const paperTitle = title || `自动组卷_${subject || '综合'}_${new Date().toISOString().slice(0, 10)}`;
    const paper = await prisma.examPaper.create({
      data: {
        id: uuid(),
        title: paperTitle,
        subject: subject || 'chinese',
        createdAt: now,
        updatedAt: now,
        questions: {
          create: picked.map((q, i) => ({
            id: uuid(),
            questionId: q.id,
            order: i + 1,
          })),
        },
      },
    });

    res.json({ success: true, data: { paperId: paper.id, title: paperTitle, count: picked.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- 薄弱点统计 ----

// GET /api/study/weak-points - 获取薄弱知识点
studyRouter.get('/weak-points', async (req: Request, res: Response) => {
  try {
    const { subject } = req.query as Record<string, string>;

    const where: any = {};
    if (subject) where.question = { subject };

    const records = await prisma.practiceRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 2000,
      include: { question: true },
    });

    // Group by subject+category+subType
    const stats: Record<string, { subject: string; category: string; subType: string; total: number; correct: number }> = {};

    for (const r of records) {
      const q = r.question;
      const key = `${q.subject}:${q.category}:${q.subType || ''}`;
      if (!stats[key]) stats[key] = { subject: q.subject, category: q.category, subType: q.subType || '', total: 0, correct: 0 };
      stats[key].total++;
      if (r.isCorrect) stats[key].correct++;
    }

    const weakPoints = Object.values(stats)
      .filter(s => s.total >= 3 && (s.correct / s.total) < 0.7)
      .map(s => ({ ...s, accuracy: Math.round((s.correct / s.total) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 20);

    res.json({ success: true, data: weakPoints });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/study/report?days=7 - 学习报告
studyRouter.get('/report', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = '7' } = req.query as Record<string, string>;
    const daysNum = Math.min(30, Math.max(1, parseInt(days)));
    const now = Math.floor(Date.now() / 1000);
    const since = now - daysNum * 86400;

    // 答题记录
    const records = await prisma.practiceRecord.findMany({
      where: { userId, createdAt: { gte: since } },
      include: { question: { select: { subject: true, difficulty: true, category: true } } },
    });

    // 错题数
    const newErrors = await prisma.errorBook.count({
      where: { userId, createdAt: { gte: since } },
    });
    const resolvedErrors = await prisma.errorBook.count({
      where: { userId, isResolved: true, updatedAt: { gte: since } },
    });

    // 学习天数
    const studyDays = new Set(records.map(r => new Date(r.createdAt * 1000).toISOString().slice(0, 10))).size;

    // 学科统计
    const bySubject: Record<string, { total: number; correct: number }> = {};
    for (const r of records) {
      const s = r.question.subject;
      if (!bySubject[s]) bySubject[s] = { total: 0, correct: 0 };
      bySubject[s].total++;
      if (r.isCorrect) bySubject[s].correct++;
    }
    const subjectStats = Object.entries(bySubject)
      .map(([subject, d]) => ({ subject, total: d.total, correct: d.correct, accuracy: Math.round((d.correct / d.total) * 100) }))
      .sort((a, b) => b.total - a.total);

    // 每日趋势
    const byDay: Record<string, { total: number; correct: number }> = {};
    for (const r of records) {
      const day = new Date(r.createdAt * 1000).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { total: 0, correct: 0 };
      byDay[day].total++;
      if (r.isCorrect) byDay[day].correct++;
    }
    const trend = Object.entries(byDay)
      .map(([date, d]) => ({ date, total: d.total, correct: d.correct, accuracy: Math.round((d.correct / d.total) * 100) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 难度统计
    const byDifficulty: Record<number, { total: number; correct: number }> = {};
    for (const r of records) {
      const d = r.question.difficulty;
      if (!byDifficulty[d]) byDifficulty[d] = { total: 0, correct: 0 };
      byDifficulty[d].total++;
      if (r.isCorrect) byDifficulty[d].correct++;
    }
    const difficultyStats = Object.entries(byDifficulty)
      .map(([diff, d]) => ({ difficulty: Number(diff), total: d.total, correct: d.correct, accuracy: Math.round((d.correct / d.total) * 100) }))
      .sort((a, b) => a.difficulty - b.difficulty);

    const totalAnswered = records.length;
    const totalCorrect = records.filter(r => r.isCorrect).length;

    res.json({
      success: true,
      data: {
        period: { days: daysNum, from: new Date(since * 1000).toISOString().slice(0, 10), to: new Date(now * 1000).toISOString().slice(0, 10) },
        summary: {
          totalAnswered,
          totalCorrect,
          accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
          studyDays,
          newErrors,
          resolvedErrors,
          avgPerDay: studyDays > 0 ? Math.round(totalAnswered / studyDays) : 0,
        },
        subjectStats,
        difficultyStats,
        trend,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
