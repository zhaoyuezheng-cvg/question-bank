import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';
import { refreshFTS } from '../utils/fts';

export const aiRouter = Router();

// AI 解析提示词模板
export const AI_PARSE_PROMPT = `你是一个专业的试题解析助手。请将用户提供的试题文本解析为结构化的 JSON 数据。

## 输出格式

输出一个 JSON 数组，每道题一个对象：

\`\`\`json
[
  {
    "subject": "chinese",
    "category": "现代文阅读",
    "subCategory": "散文阅读",
    "type": "short_answer",
    "subType": "赏析句子",
    "difficulty": 3,
    "content": "题目内容（题干）",
    "options": null,
    "answer": "标准答案",
    "analysis": "解题解析",
    "tags": ["标签1"],
    "source": "来源"
  }
]
\`\`\`

## 字段说明

### subject（学科，必填）
可选值：chinese / math / english / history / physics / chemistry / biology / geography / politics

### category（一级分类）
- 语文：现代文阅读 / 古诗文阅读 / 名著阅读 / 语言文字运用 / 基础知识
- 英语：阅读理解 / 完形填空 / 任务型阅读 / 语法填空 / 写作
- 数学：选择题 / 填空题 / 解答题 / 阅读理解题
- 其他学科：选择题 / 材料分析题 / 实验探究题 / 简答题 / 论述题

### subCategory（二级分类）
- 现代文阅读下：小说阅读 / 散文阅读 / 说明文阅读 / 议论文阅读 / 非连续性文本阅读
- 古诗文阅读下：文言文阅读 / 古诗词鉴赏
- 英语阅读理解下：细节理解 / 主旨大意 / 推理判断 / 词义猜测

### type（题型，必填）
可选值：choice / multi_choice / fill_blank / short_answer / essay / true_false

### subType（细分题型，阅读理解专用）
语文：概括内容 / 赏析句子 / 分析标题 / 分析人物 / 环境描写 / 情节梳理 / 主旨探究 / 语言赏析 / 情感体悟 / 词语理解 / 开放题 / 实词虚词 / 翻译句子 / 断句 / 文言理解 / 意象分析 / 手法赏析 / 古诗情感
英语：Detail / MainIdea / Inference / Vocabulary / Reference / Attitude / Title
通用：实验探究 / 材料分析 / 图表分析 / 论述题

### difficulty（难度 1-5）
1=基础 2=较易 3=中等 4=较难 5=困难

### options（选项）
选择题/多选题时为字符串数组，如 ["选项A", "选项B", "选项C", "选项D"]
其他题型为 null

### content（题干，必填）
保留原始题干文本，包括括号、横线等格式

### answer（答案，必填）
标准答案。选择题填字母如 "A"，多选题如 "ABD"

### analysis（解析）
解题思路和详细解析

### tags（标签）
从题目中提取关键词作为标签数组

### source（来源）
如 "2024全国甲卷"、"人教版七年级上册" 等

## 重要规则
1. 严格输出 JSON 数组，不要输出其他内容
2. 如果原文没有明确答案或解析，对应字段留空字符串 ""
3. 如果是阅读理解，一篇文章下有多道题，每道题独立解析
4. 选择题的 options 只包含选项文字，不要包含 A/B/C/D 字母前缀
5. 保持 content 中的原始格式（如填空横线 ___）
6. 如果无法判断学科，默认 chinese`;

// POST /api/ai/parse - AI 解析试题
aiRouter.post('/parse', async (req: Request, res: Response) => {
  try {
    const { text, apiKey, apiBase, model } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, error: '请提供试题文本' });

    // Get AI config from env or request
    const key = apiKey || process.env.AI_API_KEY;
    const base = apiBase || process.env.AI_API_BASE || 'https://api.openai.com';
    const mdl = model || process.env.AI_MODEL || 'gpt-4o-mini';

    if (!key) {
      return res.status(400).json({
        success: false,
        error: '请配置 AI API Key。可在环境变量 AI_API_KEY 中设置，或在请求中传入 apiKey 参数。',
      });
    }

    // Call AI API
    const response = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: mdl,
        messages: [
          { role: 'system', content: AI_PARSE_PROMPT },
          { role: 'user', content: `请解析以下试题：\n\n${text}` },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ success: false, error: `AI API 调用失败: ${response.status} ${errText}` });
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ success: false, error: 'AI 返回内容为空' });
    }

    // Parse JSON from AI response
    let questions: any[];
    try {
      const parsed = JSON.parse(content);
      questions = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.data || [parsed]);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1].trim());
        questions = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.data || [parsed]);
      } else {
        return res.status(500).json({ success: false, error: 'AI 返回的内容不是有效 JSON', raw: content });
      }
    }

    // Validate and clean
    const validTypes = ['choice', 'multi_choice', 'fill_blank', 'short_answer', 'essay', 'true_false'];
    const cleaned = questions.filter(q => q.content && q.answer).map(q => ({
      subject: q.subject || 'chinese',
      category: q.category || '',
      subCategory: q.subCategory || '',
      type: validTypes.includes(q.type) ? q.type : 'short_answer',
      subType: q.subType || null,
      difficulty: Math.min(5, Math.max(1, parseInt(q.difficulty) || 3)),
      content: String(q.content).trim(),
      options: Array.isArray(q.options) ? q.options : null,
      answer: String(q.answer).trim(),
      analysis: String(q.analysis || '').trim(),
      tags: Array.isArray(q.tags) ? q.tags : [],
      source: q.source || null,
    }));

    res.json({ success: true, data: { questions: cleaned, total: cleaned.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/import - 确认导入 AI 解析的题目
aiRouter.post('/import', async (req: Request, res: Response) => {
  try {
    const { questions, passageTitle, passageSubject, passageCategory, passageContent } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: '没有要导入的题目' });
    }

    const now = Math.floor(Date.now() / 1000);
    let passageId: string | null = null;

    // If passage info provided, create passage first
    if (passageTitle && passageContent) {
      const passage = await prisma.passage.create({
        data: {
          id: uuid(),
          title: passageTitle,
          subject: passageSubject || 'chinese',
          category: passageCategory || '',
          subCategory: '',
          content: passageContent,
          createdAt: now,
          updatedAt: now,
        },
      });
      passageId = passage.id;
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const q of questions) {
      try {
        await prisma.question.create({
          data: {
            id: uuid(),
            subject: q.subject || 'chinese',
            category: q.category || '',
            subCategory: q.subCategory || '',
            type: q.type || 'short_answer',
            subType: q.subType || null,
            difficulty: q.difficulty || 3,
            content: q.content,
            options: q.options ? JSON.stringify(q.options) : null,
            answer: q.answer,
            analysis: q.analysis || '',
            tags: q.tags ? JSON.stringify(q.tags) : null,
            source: q.source || null,
            passageId,
            createdAt: now,
            updatedAt: now,
          },
        });
        success++;
      } catch (e: any) {
        failed++;
        errors.push(e.message);
      }
    }

    res.json({ success: true, data: { success, failed, errors, passageId } });
    if (success > 0) refreshFTS();
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/generate - AI 根据知识点生成题目
aiRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { topic, subject, type, difficulty, count = 5, apiKey, apiBase, model } = req.body;
    if (!topic) return res.status(400).json({ success: false, error: '请提供知识点/主题' });

    const key = apiKey || process.env.AI_API_KEY;
    const base = apiBase || process.env.AI_API_BASE || 'https://api.openai.com/v1';
    const mdl = model || process.env.AI_MODEL || 'gpt-4o-mini';
    if (!key) return res.status(400).json({ success: false, error: '未配置 AI API Key' });

    const prompt = `请根据以下要求生成 ${count} 道题目：
- 知识点：${topic}
- 学科：${subject || '不限'}
- 题型：${type || '不限'}
- 难度：${difficulty || '中等'}

输出 JSON 数组，格式：[{"content":"题干","options":["A选项","B选项","C选项","D选项"](选择题才有),"answer":"答案","analysis":"解析","type":"题型","difficulty":1-5}]
只输出 JSON，不要其他文字。`;

    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: mdl, messages: [{ role: 'user', content: prompt }], temperature: 0.8 }),
    });
    const data = await response.json() as any;
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.json({ success: false, error: 'AI 未能生成有效题目' });

    const questions = JSON.parse(jsonMatch[0]);
    res.json({ success: true, data: { questions } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/explain - AI 详细解题步骤
aiRouter.post('/explain', async (req: Request, res: Response) => {
  try {
    const { content, answer, type, apiKey, apiBase, model } = req.body;
    if (!content) return res.status(400).json({ success: false, error: '请提供题目内容' });

    const key = apiKey || process.env.AI_API_KEY;
    const base = apiBase || process.env.AI_API_BASE || 'https://api.openai.com/v1';
    const mdl = model || process.env.AI_MODEL || 'gpt-4o-mini';
    if (!key) return res.status(400).json({ success: false, error: '未配置 AI API Key' });

    const prompt = `请为以下题目提供详细的解题步骤和思路分析：

题目：${content}
${answer ? `参考答案：${answer}` : ''}

请用清晰的步骤解释解题过程，适合学生理解学习。用 Markdown 格式。`;

    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: mdl, messages: [{ role: 'user', content: prompt }], temperature: 0.3 }),
    });
    const data = await response.json() as any;
    const explanation = data.choices?.[0]?.message?.content || '生成失败';
    res.json({ success: true, data: { explanation } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/rewrite - AI 改写题目（改变难度/题型）
aiRouter.post('/rewrite', async (req: Request, res: Response) => {
  try {
    const { content, answer, targetDifficulty, targetType, apiKey, apiBase, model } = req.body;
    if (!content) return res.status(400).json({ success: false, error: '请提供题目内容' });

    const key = apiKey || process.env.AI_API_KEY;
    const base = apiBase || process.env.AI_API_BASE || 'https://api.openai.com/v1';
    const mdl = model || process.env.AI_MODEL || 'gpt-4o-mini';
    if (!key) return res.status(400).json({ success: false, error: '未配置 AI API Key' });

    const prompt = `请将以下题目改写：

原题：${content}
${answer ? `原答案：${answer}` : ''}
${targetDifficulty ? `目标难度：${targetDifficulty}` : ''}
${targetType ? `目标题型：${targetType}` : ''}

输出 JSON：{"content":"新题干","options":[...](选择题才有),"answer":"新答案","analysis":"解析","type":"题型","difficulty":1-5}
只输出 JSON。`;

    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: mdl, messages: [{ role: 'user', content: prompt }], temperature: 0.7 }),
    });
    const data = await response.json() as any;
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.json({ success: false, error: 'AI 改写失败' });

    const question = JSON.parse(jsonMatch[0]);
    res.json({ success: true, data: { question } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
