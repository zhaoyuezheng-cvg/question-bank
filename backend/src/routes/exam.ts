import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';
import { checkAnswer } from '../utils/answer-check';

export const examRouter = Router();

// POST /api/exam/start - 开始考试
examRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const { paperId, timeLimit = 60 } = req.body;
    if (!paperId) return res.status(400).json({ success: false, error: '缺少 paperId' });

    const paper = await prisma.examPaper.findUnique({
      where: { id: paperId },
      include: { questions: { include: { question: true }, orderBy: { order: 'asc' } } },
    });
    if (!paper) return res.status(404).json({ success: false, error: '试卷不存在' });

    const now = Math.floor(Date.now() / 1000);
    const session = await prisma.examSession.create({
      data: {
        id: uuid(),
        paperId: paper.id,
        title: paper.title,
        subject: paper.subject,
        totalScore: paper.totalScore || 100,
        timeLimit,
        totalCount: paper.questions.length,
        startedAt: now,
        createdAt: now,
      },
    });

    // Return questions without answers
    const questions = paper.questions.map((pq, i) => ({
      id: pq.question.id,
      order: i + 1,
      content: pq.question.content,
      type: pq.question.type,
      options: pq.question.options ? JSON.parse(pq.question.options) : undefined,
      score: pq.score || Math.floor((paper.totalScore || 100) / paper.questions.length),
    }));

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        title: paper.title,
        subject: paper.subject,
        totalScore: session.totalScore,
        timeLimit,
        questions,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/exam/:id/submit - 交卷
examRouter.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const { answers, forceTimeout } = req.body;
    const session = await prisma.examSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ success: false, error: '考试不存在' });
    if (session.status !== 'in_progress') return res.status(400).json({ success: false, error: '考试已结束' });

    // Get correct answers
    const paper = await prisma.examPaper.findUnique({
      where: { id: session.paperId },
      include: { questions: { include: { question: true }, orderBy: { order: 'asc' } } },
    });
    if (!paper) return res.status(404).json({ success: false, error: '试卷不存在' });

    // Grade answers
    let correctCount = 0;
    let totalScore = 0;
    const results: any[] = [];

    for (const pq of paper.questions) {
      const userAnswer = answers?.[pq.question.id] || '';
      // 使用统一的答题判断逻辑
      const isCorrect = checkAnswer(userAnswer, pq.question.answer, pq.question.type);

      if (isCorrect) {
        correctCount++;
        totalScore += pq.score || Math.floor((session.totalScore) / session.totalCount);
      }

      results.push({
        questionId: pq.question.id,
        userAnswer,
        correctAnswer: pq.question.answer,
        isCorrect,
        analysis: pq.question.analysis,
        score: isCorrect ? (pq.score || Math.floor(session.totalScore / session.totalCount)) : 0,
      });
    }

    const now = Math.floor(Date.now() / 1000);

    // Auto-add wrong answers to error book
    for (const r of results) {
      if (!r.isCorrect && r.userAnswer) {
        try {
          const existingError = await prisma.errorBook.findFirst({ where: { questionId: r.questionId, userId: null } });
          if (existingError) {
            await prisma.errorBook.update({
              where: { id: existingError.id },
              data: { wrongAnswer: r.userAnswer, updatedAt: now, isResolved: false, nextReview: now },
            });
          } else {
            await prisma.errorBook.create({
              data: { id: uuid(), questionId: r.questionId, wrongAnswer: r.userAnswer, nextReview: now, createdAt: now, updatedAt: now },
            });
          }
        } catch {}
      }
    }

    const updated = await prisma.examSession.update({
      where: { id: req.params.id },
      data: {
        answers: JSON.stringify(answers || {}),
        score: totalScore,
        correctCount,
        status: forceTimeout ? 'timeout' : 'completed',
        completedAt: now,
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: updated.id,
        score: totalScore,
        totalScore: session.totalScore,
        correctCount,
        totalCount: session.totalCount,
        accuracy: Math.round((correctCount / session.totalCount) * 100),
        timeUsed: now - session.startedAt,
        results,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/exam/:id - 获取考试结果
examRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = await prisma.examSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ success: false, error: '考试不存在' });

    res.json({ success: true, data: session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/exam - 考试历史
examRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const size = Math.min(100, Math.max(1, parseInt(pageSize)));

    const [items, total] = await Promise.all([
      prisma.examSession.findMany({
        skip: (pageNum - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.examSession.count(),
    ]);

    res.json({ success: true, data: { items, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/exam/compare?paperId=xxx - 同一试卷多次考试对比
examRouter.get('/compare', async (req: Request, res: Response) => {
  try {
    const { paperId } = req.query as Record<string, string>;
    if (!paperId) return res.status(400).json({ success: false, error: '缺少 paperId' });

    const sessions = await prisma.examSession.findMany({
      where: { paperId, status: { in: ['completed', 'timeout'] } },
      orderBy: { completedAt: 'asc' },
    });

    if (sessions.length === 0) {
      return res.json({ success: true, data: { sessions: [], questionStats: [] } });
    }

    // 每道题的得分率统计
    const paper = await prisma.examPaper.findUnique({
      where: { id: paperId },
      include: { questions: { include: { question: true }, orderBy: { order: 'asc' } } },
    });

    const questionStats = paper?.questions.map((pq, i) => {
      let correctCount = 0;
      let totalAttempted = 0;
      for (const s of sessions) {
        if (!s.answers) continue;
        const answers = JSON.parse(s.answers);
        if (answers[pq.question.id]) {
          totalAttempted++;
          const user = answers[pq.question.id].trim().toUpperCase();
          const correct = pq.question.answer.trim().toUpperCase();
          if (['choice', 'multi_choice', 'true_false'].includes(pq.question.type)) {
            if (user === correct) correctCount++;
          } else {
            const keywords = correct.split(/[;；\n]/).map(s => s.trim()).filter(Boolean);
            if (keywords.length > 0 && keywords.every(k => user.includes(k))) correctCount++;
          }
        }
      }
      return {
        order: i + 1,
        questionId: pq.question.id,
        content: pq.question.content.slice(0, 80),
        type: pq.question.type,
        difficulty: pq.question.difficulty,
        correctRate: totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0,
        totalAttempted,
      };
    }) || [];

    // 趋势数据
    const trend = sessions.map(s => ({
      id: s.id,
      date: s.completedAt ? new Date(s.completedAt * 1000).toISOString().slice(0, 10) : '-',
      score: s.score,
      totalScore: s.totalScore,
      accuracy: s.totalCount > 0 ? Math.round((s.correctCount || 0) / s.totalCount * 100) : 0,
      timeUsed: s.completedAt && s.startedAt ? s.completedAt - s.startedAt : 0,
    }));

    res.json({ success: true, data: { sessions: trend, questionStats } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
