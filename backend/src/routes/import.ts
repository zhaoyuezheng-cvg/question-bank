import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export const importRouter = Router();

// 文件上传配置
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 .xlsx / .xls / .csv 文件'));
    }
  },
});

// POST /api/import/text - 批量导入（文本解析格式）
importRouter.post('/text', async (req: Request, res: Response) => {
  try {
    const { text, subject, category, subCategory } = req.body;
    if (!text) return res.status(400).json({ success: false, error: '缺少 text 字段' });

    const questions = parseImportText(text, subject || 'chinese', category || '', subCategory || '');
    const now = Math.floor(Date.now() / 1000);

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const q of questions) {
      try {
        // 去重检查：同同学科+题型+题干内容
        const existing = await prisma.question.findFirst({
          where: {
            subject: q.subject,
            type: q.type,
            content: q.content.trim(),
          },
        });
        if (existing) {
          skipped++;
          continue;
        }

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
      data: { total: questions.length, success, failed, skipped, errors },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/import/excel - Excel 导入
importRouter.post('/excel', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: '请上传文件' });

    const defaultSubject = req.body.subject || 'chinese';
    const defaultCategory = req.body.category || '';
    const defaultSubCategory = req.body.subCategory || '';

    // 读取 Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName]);

    // 清理临时文件
    fs.unlinkSync(req.file.path);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: '文件为空' });
    }

    const now = Math.floor(Date.now() / 1000);
    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    // 列名映射（支持中英文表头）
    const colMap: Record<string, string> = {
      '学科': 'subject', '题型': 'type', '分类': 'category', '子分类': 'subCategory',
      '难度': 'difficulty', '题干': 'content', '内容': 'content',
      '选项': 'options', '答案': 'answer', '解析': 'analysis',
      '标签': 'tags', '来源': 'source',
      'subject': 'subject', 'type': 'type', 'category': 'category',
      'difficulty': 'difficulty', 'content': 'content', 'answer': 'answer',
      'analysis': 'analysis', 'tags': 'tags', 'source': 'source',
      'options': 'options',
    };

    const subjectMap: Record<string, string> = {
      '语文': 'chinese', '数学': 'math', '英语': 'english', '历史': 'history',
      '物理': 'physics', '化学': 'chemistry', '生物': 'biology', '地理': 'geography', '政治': 'politics',
      'chinese': 'chinese', 'math': 'math', 'english': 'english', 'history': 'history',
      'physics': 'physics', 'chemistry': 'chemistry', 'biology': 'biology',
      'geography': 'geography', 'politics': 'politics',
    };

    const typeMap: Record<string, string> = {
      '单选题': 'choice', '单选': 'choice', '多选题': 'multi_choice', '多选': 'multi_choice',
      '填空题': 'fill_blank', '填空': 'fill_blank', '简答题': 'short_answer', '简答': 'short_answer',
      '论述题': 'essay', '论述': 'essay', '判断题': 'true_false', '判断': 'true_false',
      'choice': 'choice', 'multi_choice': 'multi_choice', 'fill_blank': 'fill_blank',
      'short_answer': 'short_answer', 'essay': 'essay', 'true_false': 'true_false',
    };

    for (const row of rows) {
      try {
        // 标准化列名
        const q: Record<string, any> = {};
        for (const [key, val] of Object.entries(row)) {
          const mapped = colMap[key.trim()] || key.trim();
          q[mapped] = val;
        }

        const subject = subjectMap[String(q.subject || defaultSubject)] || defaultSubject;
        const type = typeMap[String(q.type || 'short_answer')] || 'short_answer';
        const content = String(q.content || '').trim();
        const answer = String(q.answer || '').trim();

        if (!content || !answer) {
          failed++;
          errors.push(`缺少题干或答案: ${content.slice(0, 20) || '(空行)'}`);
          continue;
        }

        // 去重
        const existing = await prisma.question.findFirst({
          where: { subject, type, content },
        });
        if (existing) { skipped++; continue; }

        // 解析选项
        let options: string[] | null = null;
        if (q.options) {
          const optStr = String(q.options);
          // 支持 A.xxx;B.xxx 或 用 | 分隔
          if (optStr.includes(';') || optStr.includes('|')) {
            options = optStr.split(/[;|]/).map((s: string) => s.trim()).filter(Boolean);
          } else {
            options = optStr.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean);
          }
        }

        // 解析标签
        let tags: string[] | null = null;
        if (q.tags) {
          tags = String(q.tags).split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean);
        }

        // 解析难度
        let difficulty = 3;
        if (q.difficulty) {
          const d = parseInt(String(q.difficulty));
          if (d >= 1 && d <= 5) difficulty = d;
        }

        await prisma.question.create({
          data: {
            id: uuid(),
            subject,
            category: String(q.category || defaultCategory),
            subCategory: String(q.subCategory || defaultSubCategory),
            type,
            subType: q.subType ? String(q.subType) : null,
            difficulty,
            content,
            options: options ? JSON.stringify(options) : null,
            answer,
            analysis: q.analysis ? String(q.analysis) : '',
            tags: tags ? JSON.stringify(tags) : null,
            source: q.source ? String(q.source) : null,
            createdAt: now,
            updatedAt: now,
          },
        });
        success++;
      } catch (e: any) {
        failed++;
        errors.push(`导入失败: ${e.message}`);
      }
    }

    res.json({
      success: true,
      data: { total: rows.length, success, failed, skipped, errors },
    });
  } catch (err: any) {
    // 清理临时文件
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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
  // Split by markers, numbered patterns, or double newlines
  let blocks: string[] = [];
  // First try marker-based split
  if (text.includes('【题干】')) {
    blocks = text.split(/(?=【题干】)/).filter(b => b.trim());
  } else if (/^\d+[.、．]/m.test(text)) {
    // Numbered format - split by number pattern at start of line
    blocks = text.split(/(?=^\d+[.、．])/m).filter(b => b.trim());
  } else {
    // Split by blank lines (double newline)
    blocks = text.split(/\n\s*\n/).filter(b => b.trim());
  }

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
