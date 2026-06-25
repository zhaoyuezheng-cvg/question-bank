import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

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
      const correctAnswer = pq.question.answer.trim().toUpperCase();
      const user = userAnswer.trim().toUpperCase();
      let isCorrect = false;

      if (['choice', 'multi_choice', 'true_false'].includes(pq.question.type)) {
        isCorrect = user === correctAnswer;
      } else {
        const keywords = correctAnswer.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean);
        isCorrect = keywords.length > 0 && keywords.some(k => user.includes(k));
      }

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
