import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const backupRouter = Router();

// GET /api/backup/export - 导出数据库
backupRouter.get('/export', async (_req: Request, res: Response) => {
  try {
    const [questions, papers, paperQuestions, flashcards, examSessions, errorBooks, favorites, practiceRecords, paperTemplates, questionRelations, questionNotes, textbooks, words, studyPlans, studyCheckins] = await Promise.all([
      prisma.question.findMany(),
      prisma.examPaper.findMany(),
      prisma.paperQuestion.findMany(),
      prisma.flashcard.findMany().catch(() => []),
      prisma.examSession.findMany().catch(() => []),
      prisma.errorBook.findMany(),
      prisma.favorite.findMany(),
      prisma.practiceRecord.findMany(),
      prisma.paperTemplate.findMany().catch(() => []),
      prisma.questionRelation.findMany().catch(() => []),
      prisma.questionNote.findMany().catch(() => []),
      prisma.textbookCatalog.findMany().catch(() => []),
      prisma.wordBook.findMany().catch(() => []),
      prisma.studyPlan.findMany().catch(() => []),
      prisma.studyCheckin.findMany().catch(() => []),
    ]);

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        questions: questions.map(q => ({ ...q, options: q.options ? JSON.parse(q.options) : null, tags: q.tags ? JSON.parse(q.tags) : null })),
        papers,
        paperQuestions,
        flashcards,
        examSessions,
        errorBooks,
        favorites,
        practiceRecords,
        paperTemplates,
        questionRelations,
        questionNotes,
        textbooks,
        words,
        studyPlans,
        studyCheckins,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="question-bank-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(backup);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/backup/import - 导入数据库
backupRouter.post('/import', async (req: Request, res: Response) => {
  try {
    const backup = req.body;
    if (!backup.data?.questions) return res.status(400).json({ success: false, error: '无效的备份文件' });

    const now = Math.floor(Date.now() / 1000);
    let imported = 0;
    let skipped = 0;

    // Import questions
    for (const q of backup.data.questions) {
      try {
        await prisma.question.upsert({
          where: { id: q.id },
          update: {
            subject: q.subject,
            category: q.category,
            subCategory: q.subCategory,
            type: q.type,
            difficulty: q.difficulty,
            content: q.content,
            options: q.options ? JSON.stringify(q.options) : null,
            answer: q.answer,
            analysis: q.analysis || '',
            tags: q.tags ? JSON.stringify(q.tags) : null,
            source: q.source || null,
            updatedAt: now,
          },
          create: {
            id: q.id,
            subject: q.subject,
            category: q.category,
            subCategory: q.subCategory,
            type: q.type,
            difficulty: q.difficulty,
            content: q.content,
            options: q.options ? JSON.stringify(q.options) : null,
            answer: q.answer,
            analysis: q.analysis || '',
            tags: q.tags ? JSON.stringify(q.tags) : null,
            source: q.source || null,
            createdAt: q.createdAt || now,
            updatedAt: now,
          },
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    res.json({ success: true, data: { imported, skipped, total: backup.data.questions.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
