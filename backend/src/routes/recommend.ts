import { Router, Request, Response } from 'express';
import prisma from '../prisma';

export const recommendRouter = Router();

// GET /api/recommend/weak - 智能推荐薄弱题目
recommendRouter.get('/weak', async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query as Record<string, string>;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    // Analyze practice records to find weak areas
    const records = await prisma.practiceRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
      include: { question: true },
    });

    // Group by subject and category, calculate accuracy
    const stats: Record<string, { total: number; correct: number; subject: string; category: string }> = {};
    for (const r of records) {
      const key = `${r.question.subject}:${r.question.category}`;
      if (!stats[key]) stats[key] = { total: 0, correct: 0, subject: r.question.subject, category: r.question.category };
      stats[key].total++;
      if (r.isCorrect) stats[key].correct++;
    }

    // Find weak areas (accuracy < 70% and at least 3 attempts)
    const weakAreas = Object.values(stats)
      .filter(s => s.total >= 3 && (s.correct / s.total) < 0.7)
      .sort((a, b) => (a.correct / a.total) - (b.correct / b.total))
      .slice(0, 5);

    if (weakAreas.length === 0) {
      // No weak areas found, return random questions
      const questions = await prisma.question.findMany({
        take: limitNum,
        orderBy: { updatedAt: 'desc' },
      });
      const parsed = questions.map(q => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : undefined,
        tags: q.tags ? JSON.parse(q.tags) : [],
        reason: '随机推荐',
      }));
      return res.json({ success: true, data: { weakAreas: [], questions: parsed } });
    }

    // Get questions from weak areas
    const weakSubjectCategories = weakAreas.map(w => ({
      subject: w.subject,
      category: w.category,
    }));

    const questions = await prisma.question.findMany({
      where: {
        OR: weakSubjectCategories.map(w => ({
          subject: w.subject,
          category: w.category,
        })),
      },
      take: limitNum,
      orderBy: { updatedAt: 'desc' },
    });

    const parsed = questions.map(q => {
      const area = weakAreas.find(w => w.subject === q.subject && w.category === q.category);
      return {
        ...q,
        options: q.options ? JSON.parse(q.options) : undefined,
        tags: q.tags ? JSON.parse(q.tags) : [],
        reason: area ? `${q.subject === 'chinese' ? '语文' : q.subject} · ${q.category} (正确率 ${Math.round((area.correct / area.total) * 100)}%)` : '',
      };
    });

    res.json({ success: true, data: { weakAreas, questions: parsed } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/recommend/similar/:id - 推荐相似题目
recommendRouter.get('/similar/:id', async (req: Request, res: Response) => {
  try {
    const question = await prisma.question.findUnique({ where: { id: req.params.id } });
    if (!question) return res.status(404).json({ success: false, error: '题目不存在' });

    // Find similar questions by subject + category + type
    const similar = await prisma.question.findMany({
      where: {
        id: { not: question.id },
        subject: question.subject,
        category: question.category,
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    });

    // If not enough, add same subject different category
    if (similar.length < 5) {
      const more = await prisma.question.findMany({
        where: {
          id: { not: question.id, notIn: similar.map(s => s.id) },
          subject: question.subject,
        },
        take: 5 - similar.length,
        orderBy: { updatedAt: 'desc' },
      });
      similar.push(...more);
    }

    const parsed = similar.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : undefined,
      tags: q.tags ? JSON.parse(q.tags) : [],
    }));

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/recommend/enhanced-stats - 增强统计
recommendRouter.get('/enhanced-stats', async (req: Request, res: Response) => {
  try {
    const { period } = req.query as Record<string, string>;
    const now = Math.floor(Date.now() / 1000);
    let since = 0;
    if (period === 'week') since = now - 7 * 86400;
    else if (period === 'month') since = now - 30 * 86400;

    const where: any = {};
    if (since > 0) where.createdAt = { gte: since };

    const records = await prisma.practiceRecord.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { question: true },
    });

    // Accuracy by subject
    const bySubject: Record<string, { total: number; correct: number }> = {};
    // Accuracy by category
    const byCategory: Record<string, { total: number; correct: number; subject: string }> = {};
    // Accuracy by difficulty
    const byDifficulty: Record<number, { total: number; correct: number }> = {};
    // Daily trend (last 30 days)
    const thirtyDaysAgo = now - 30 * 86400;
    const dailyTrend: Record<string, { total: number; correct: number }> = {};

    for (const r of records) {
      const q = r.question;
      // By subject
      if (!bySubject[q.subject]) bySubject[q.subject] = { total: 0, correct: 0 };
      bySubject[q.subject].total++;
      if (r.isCorrect) bySubject[q.subject].correct++;

      // By category
      const catKey = `${q.subject}:${q.category}`;
      if (!byCategory[catKey]) byCategory[catKey] = { total: 0, correct: 0, subject: q.subject };
      byCategory[catKey].total++;
      if (r.isCorrect) byCategory[catKey].correct++;

      // By difficulty
      if (!byDifficulty[q.difficulty]) byDifficulty[q.difficulty] = { total: 0, correct: 0 };
      byDifficulty[q.difficulty].total++;
      if (r.isCorrect) byDifficulty[q.difficulty].correct++;

      // Daily trend
      if (r.createdAt >= thirtyDaysAgo) {
        const day = new Date(r.createdAt * 1000).toISOString().slice(0, 10);
        if (!dailyTrend[day]) dailyTrend[day] = { total: 0, correct: 0 };
        dailyTrend[day].total++;
        if (r.isCorrect) dailyTrend[day].correct++;
      }
    }

    // Format results
    const subjectStats = Object.entries(bySubject).map(([subject, s]) => ({
      subject,
      total: s.total,
      correct: s.correct,
      accuracy: Math.round((s.correct / s.total) * 100),
    })).sort((a, b) => a.accuracy - b.accuracy);

    const categoryStats = Object.entries(byCategory).map(([key, c]) => ({
      subject: c.subject,
      category: key.split(':')[1],
      total: c.total,
      correct: c.correct,
      accuracy: Math.round((c.correct / c.total) * 100),
    })).sort((a, b) => a.accuracy - b.accuracy).slice(0, 20);

    const difficultyStats = [1, 2, 3, 4, 5].map(d => {
      const s = byDifficulty[d] || { total: 0, correct: 0 };
      return { difficulty: d, total: s.total, correct: s.correct, accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0 };
    });

    const trend = Object.entries(dailyTrend).map(([date, d]) => ({
      date,
      total: d.total,
      correct: d.correct,
      accuracy: Math.round((d.correct / d.total) * 100),
    })).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: { subjectStats, categoryStats, difficultyStats, trend, totalRecords: records.length },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/recommend/suggest-difficulty/:id - 根据答题记录推荐难度
recommendRouter.get('/suggest-difficulty/:id', async (req: Request, res: Response) => {
  try {
    const question = await prisma.question.findUnique({ where: { id: req.params.id } });
    if (!question) return res.status(404).json({ success: false, error: '题目不存在' });

    // Find questions in same subject+category with practice records
    const similarQuestions = await prisma.question.findMany({
      where: { subject: question.subject, category: question.category, id: { not: question.id } },
      select: { id: true },
      take: 50,
    });

    if (similarQuestions.length === 0) {
      return res.json({ success: true, data: { suggested: question.difficulty, confidence: 'low', reason: '无同类题目数据' } });
    }

    const ids = similarQuestions.map(q => q.id);
    const records = await prisma.practiceRecord.findMany({
      where: { questionId: { in: ids } },
      include: { question: { select: { difficulty: true } } },
    });

    if (records.length < 5) {
      return res.json({ success: true, data: { suggested: question.difficulty, confidence: 'low', reason: '答题数据不足' } });
    }

    // Calculate accuracy by difficulty level
    const byDiff: Record<number, { total: number; correct: number }> = {};
    for (const r of records) {
      const d = r.question.difficulty;
      if (!byDiff[d]) byDiff[d] = { total: 0, correct: 0 };
      byDiff[d].total++;
      if (r.isCorrect) byDiff[d].correct++;
    }

    // Find the difficulty level where accuracy is closest to 60% (good challenge level)
    let bestDiff = question.difficulty;
    let bestScore = Infinity;
    for (const [d, stats] of Object.entries(byDiff)) {
      const acc = stats.correct / stats.total;
      const score = Math.abs(acc - 0.6); // 60% accuracy = ideal difficulty
      if (score < bestScore && stats.total >= 3) {
        bestScore = score;
        bestDiff = parseInt(d);
      }
    }

    const confidence = records.length >= 20 ? 'high' : records.length >= 10 ? 'medium' : 'low';
    res.json({
      success: true,
      data: {
        suggested: bestDiff,
        confidence,
        reason: `基于 ${records.length} 条同类答题记录，${['基础','较易','中等','较难','困难'][bestDiff-1]}难度的正确率最接近60%`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

