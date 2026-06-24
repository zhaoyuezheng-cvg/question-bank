import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

export const importRouter = Router();

// POST /api/import/text - 批量导入（文本解析格式）
importRouter.post('/text', async (req: Request, res: Response) => {
  try {
    const { text, subject, category, subCategory } = req.body;
    if (!text) return res.status(400).json({ success: false, error: '缺少 text 字段' });

    const questions = parseImportText(text, subject || 'chinese', category || '', subCategory || '');
    const now = Math.floor(Date.now() / 1000);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const q of questions) {
      try {
        await prisma.question.create({
          data: {
            id: uuid(),
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
            createdAt: now,
            updatedAt: now,
          },
        });
        success++;
      } catch (e: any) {
        failed++;
        errors.push(`题目 "${q.content.slice(0, 30)}..." 导入失败: ${e.message}`);
      }
    }

    res.json({
      success: true,
      data: { total: questions.length, success, failed, errors },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- 文本解析核心函数 ----
interface ParsedQuestion {
  subject: string;
  category: string;
  subCategory: string;
  type: string;
  difficulty: number;
  content: string;
  options?: string[];
  answer: string;
  analysis: string;
  tags?: string[];
  source?: string;
}

function parseImportText(
  text: string,
  defaultSubject: string,
  defaultCategory: string,
  defaultSubCategory: string
): ParsedQuestion[] {
  const results: ParsedQuestion[] = [];

  // Split by 【题干】 marker, or by numbered patterns like "1." "2." etc.
  const blocks = text.split(/(?=【题干】|(?=\d+[.、．]\s))/).filter(b => b.trim());

  for (const block of blocks) {
    try {
      const q: ParsedQuestion = {
        subject: defaultSubject,
        category: defaultCategory,
        subCategory: defaultSubCategory,
        type: 'short_answer',
        difficulty: 3,
        content: '',
        answer: '',
        analysis: '',
      };

      // Extract sections
      const contentMatch = block.match(/【题干】\s*([\s\S]*?)(?=【|$)/);
      const answerMatch = block.match(/【答案】\s*([\s\S]*?)(?=【|$)/);
      const analysisMatch = block.match(/【解析】\s*([\s\S]*?)(?=【|$)/);
      const typeMatch = block.match(/【题型】\s*(\S+)/);
      const diffMatch = block.match(/【难度】\s*(\d)/);
      const tagsMatch = block.match(/【标签】\s*(.*)/);
      const sourceMatch = block.match(/【来源】\s*(.*)/);

      // If no 【题干】 marker, try to parse as numbered list
      if (!contentMatch) {
        const numMatch = block.match(/^\d+[.、．]\s*([\s\S]*)/);
        if (numMatch) {
          q.content = numMatch[1].trim();
        } else {
          q.content = block.trim();
        }
      } else {
        q.content = contentMatch[1].trim();
      }

      if (answerMatch) q.answer = answerMatch[1].trim();
      if (analysisMatch) q.analysis = analysisMatch[1].trim();
      if (typeMatch) q.type = mapTypeName(typeMatch[1]);
      if (diffMatch) q.difficulty = parseInt(diffMatch[1]);
      if (tagsMatch) q.tags = tagsMatch[1].split(/[,，、]/).map(t => t.trim()).filter(Boolean);
      if (sourceMatch) q.source = sourceMatch[1].trim();

      // Extract options for choice questions
      const optionMatches = [...block.matchAll(/([A-D])[.、．)\s]\s*([\s\S]*?)(?=[A-D][.、．)\s]|【|$)/g)];
      if (optionMatches.length >= 2) {
        q.options = optionMatches.map(m => m[2].trim());
        q.type = q.type === 'short_answer' ? 'choice' : q.type;
      }

      if (q.content) {
        results.push(q);
      }
    } catch {
      // Skip malformed blocks
    }
  }

  return results;
}

function mapTypeName(name: string): string {
  const map: Record<string, string> = {
    '单选': 'choice', '单选题': 'choice',
    '多选': 'multi_choice', '多选题': 'multi_choice',
    '填空': 'fill_blank', '填空题': 'fill_blank',
    '简答': 'short_answer', '简答题': 'short_answer',
    '论述': 'essay', '论述题': 'essay',
    '判断': 'true_false', '判断题': 'true_false',
  };
  return map[name] || 'short_answer';
}
