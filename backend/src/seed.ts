import prisma from './prisma';
import { v4 as uuid } from 'uuid';

async function seed() {
  console.log('🌱 正在初始化种子数据...');

  const now = Math.floor(Date.now() / 1000);

  // ---- 标签 ----
  const tags = ['高考真题', '模拟题', '易错题', '重点', '古诗词', '文言文', '现代文', '作文素材'];
  for (const name of tags) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { id: uuid(), name },
    });
  }

  // ---- 分类（语文示例） ----
  const chineseCategories = [
    { name: '古诗词', children: ['默写', '鉴赏', '炼字'] },
    { name: '文言文', children: ['实词', '虚词', '翻译', '断句'] },
    { name: '现代文', children: ['主旨概括', '手法分析', '人物形象', '词句理解'] },
    { name: '作文', children: ['审题立意', '素材积累', '范文'] },
  ];

  for (const cat of chineseCategories) {
    const parent = await prisma.category.create({
      data: { id: uuid(), subject: 'chinese', name: cat.name },
    });
    for (const child of cat.children) {
      await prisma.category.create({
        data: { id: uuid(), subject: 'chinese', name: child, parentId: parent.id },
      });
    }
  }

  // ---- 示例题目 ----
  const sampleQuestions = [
    {
      subject: 'chinese', category: '古诗词', subCategory: '默写', type: 'fill_blank',
      difficulty: 2, content: '补写出下列名篇名句中的空缺部分：\n\n(1) 风急天高猿啸哀，____________。（杜甫《登高》）\n\n(2) ____________，不尽长江滚滚来。（杜甫《登高》）',
      answer: '(1) 渚清沙白鸟飞回\n(2) 无边落木萧萧下',
      analysis: '本题考查名篇名句默写，需注意"渚""萧"等字的书写。',
      tags: '["高考真题","古诗词"]', source: '2024全国甲卷',
    },
    {
      subject: 'math', category: '函数', subCategory: '导数', type: 'short_answer',
      difficulty: 4, content: '已知函数 $f(x) = x^3 - 3x + 1$，求 $f(x)$ 的单调区间和极值。',
      answer: '单调递增区间：$(-\\infty, -1)$ 和 $(1, +\\infty)$；单调递减区间：$(-1, 1)$。\n极大值：$f(-1) = 3$；极小值：$f(1) = -1$。',
      analysis: '求导得 $f\'(x) = 3x^2 - 3 = 3(x+1)(x-1)$，令 $f\'(x) = 0$ 得 $x = \\pm 1$。',
      tags: '["模拟题","重点"]',
    },
    {
      subject: 'english', category: '阅读理解', subCategory: '细节理解', type: 'choice',
      difficulty: 3, content: 'Read the following passage and choose the best answer.\n\n"The rapid development of artificial intelligence has transformed many industries, from healthcare to finance. While AI offers tremendous benefits, it also raises important ethical questions about privacy, employment, and decision-making."\n\nAccording to the passage, what is the main concern about AI?',
      options: ['It is too expensive to implement', 'It raises ethical questions', 'It is developing too slowly', 'It only benefits healthcare'],
      answer: 'B',
      analysis: '文中明确提到 AI "raises important ethical questions"，对应选项 B。',
      tags: '["模拟题"]',
    },
  ];

  for (const q of sampleQuestions) {
    await prisma.question.create({
      data: {
        id: uuid(),
        ...q,
        difficulty: q.difficulty as any,
        options: (q as any).options ? JSON.stringify((q as any).options) : null,
        tags: q.tags || null,
        source: (q as any).source || null,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  console.log('✅ 种子数据初始化完成');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
