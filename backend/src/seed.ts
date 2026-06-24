import prisma from './prisma';
import { v4 as uuid } from 'uuid';

async function seed() {
  console.log('🌱 正在清空旧数据并写入测试题库...');

  // 清空旧数据
  await prisma.paperQuestion.deleteMany();
  await prisma.examPaper.deleteMany();
  await prisma.question.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();

  const now = Math.floor(Date.now() / 1000);
  const q = (data: any) => {
    const { options, tags, ...rest } = data;
    return prisma.question.create({
      data: {
        id: uuid(),
        createdAt: now,
        updatedAt: now,
        ...rest,
        options: options ? JSON.stringify(options) : null,
        tags: tags || null,
      }
    });
  };

  // ===== 标签 =====
  const tagNames = ['高考真题', '模拟题', '易错题', '重点', '基础巩固', '压轴题', '竞赛', '期中考试', '期末考试'];
  for (const name of tagNames) {
    await prisma.tag.create({ data: { id: uuid(), name } });
  }

  // ===== 分类 =====
  const catData: Record<string, string[][]> = {
    chinese: [['古诗词', '默写', '鉴赏', '炼字'], ['文言文', '实词', '虚词', '翻译', '断句'], ['现代文', '主旨概括', '手法分析', '人物形象', '词句理解'], ['作文', '审题立意', '素材积累']],
    math: [['函数', '导数', '指数对数', '三角函数'], ['几何', '立体几何', '解析几何', '向量'], ['概率统计', '古典概型', '分布列'], ['数列', '等差数列', '等比数列', '求和']],
    english: [['阅读理解', '细节理解', '主旨大意', '推理判断'], ['完形填空', '词义辨析', '逻辑推理'], ['语法填空', '时态', '从句', '非谓语'], ['写作', '应用文', '读后续写']],
    physics: [['力学', '牛顿定律', '动量', '能量'], ['电磁学', '电场', '磁场', '电路'], ['热学', '光学', '原子物理']],
    chemistry: [['无机化学', '元素周期', '氧化还原', '离子反应'], ['有机化学', '官能团', '同分异构'], ['化学实验', '气体制备', '定量实验']],
    biology: [['细胞', '结构', '代谢', '分裂'], ['遗传', '基因', '变异', '进化'], ['生态', '种群', '群落', '生态系统']],
    history: [['中国古代史', '先秦', '秦汉', '唐宋', '明清'], ['中国近代史', '鸦片战争', '辛亥革命', '五四运动'], ['世界史', '工业革命', '两次世界大战']],
    geography: [['自然地理', '气候', '地形', '水文'], ['人文地理', '城市', '农业', '工业'], ['区域地理', '中国地理', '世界地理']],
    politics: [['经济生活', '消费', '生产', '分配'], ['政治生活', '公民', '政府', '政党'], ['哲学', '唯物论', '辩证法', '认识论']],
  };

  for (const [subject, categories] of Object.entries(catData)) {
    for (const [parentName, ...children] of categories) {
      const parent = await prisma.category.create({
        data: { id: uuid(), subject, name: parentName }
      });
      for (const childName of children) {
        await prisma.category.create({
          data: { id: uuid(), subject, name: childName, parentId: parent.id }
        });
      }
    }
  }

  // ==================== 语文 ====================
  await q({
    subject: 'chinese', category: '古诗词', subCategory: '默写', type: 'fill_blank',
    difficulty: 2, content: '补写出下列名篇名句中的空缺部分：\n\n(1) 风急天高猿啸哀，____________。（杜甫《登高》）\n\n(2) ____________，不尽长江滚滚来。（杜甫《登高》）\n\n(3) 人生自古谁无死？____________。（文天祥《过零丁洋》）',
    answer: '(1) 渚清沙白鸟飞回\n(2) 无边落木萧萧下\n(3) 留取丹心照汗青',
    analysis: '注意"渚""萧""汗青"等字的书写。',
    tags: '["高考真题","古诗词"]', source: '2024全国甲卷',
  });

  await q({
    subject: 'chinese', category: '古诗词', subCategory: '鉴赏', type: 'short_answer',
    difficulty: 3, content: '阅读下面这首宋词，完成题目。\n\n**江城子·密州出猎** （苏轼）\n\n老夫聊发少年狂，左牵黄，右擎苍，锦帽貂裘，千骑卷平冈。为报倾城随太守，亲射虎，看孙郎。\n\n酒酣胸胆尚开张。鬓微霜，又何妨！持节云中，何日遣冯唐？会挽雕弓如满月，西北望，射天狼。\n\n**问题：** 词中"亲射虎""遣冯唐""射天狼"三个典故分别表达了什么？',
    answer: '"亲射虎"以孙权自比，表达豪迈气概；"遣冯唐"以魏尚自比，希望得到朝廷重用；"射天狼"表达抵御外敌、报效国家的壮志。',
    analysis: '三个典故层层递进：自比→求用→报国，展现了苏轼渴望为国效力的爱国情怀。',
    tags: '["高考真题","古诗词"]', source: '高考真题改编',
  });

  await q({
    subject: 'chinese', category: '文言文', subCategory: '翻译', type: 'short_answer',
    difficulty: 3, content: '将下列文言文句子翻译为现代汉语：\n\n(1) 师者，所以传道受业解惑也。\n\n(2) 君子博学而日参省乎己，则知明而行无过矣。',
    answer: '(1) 老师，是用来传授道理、教授学业、解答疑难问题的人。\n(2) 君子广泛地学习并且每天检查反省自己，就会智慧明达而且行为没有过错了。',
    analysis: '(1) 注意"所以"表凭借，"受"通"授"。(2) 注意"日"名词作状语，"知"通"智"。',
    tags: '["重点","文言文"]',
  });

  await q({
    subject: 'chinese', category: '现代文', subCategory: '主旨概括', type: 'short_answer',
    difficulty: 3, content: '阅读下面的文段，概括其主要观点（不超过50字）：\n\n> 在信息爆炸的时代，人们面临着前所未有的选择困境。过多的信息不仅没有帮助我们做出更好的决定，反而增加了焦虑和犹豫。真正的智慧不在于获取更多信息，而在于学会筛选和聚焦。',
    answer: '信息爆炸时代，过多信息反而增加焦虑，智慧在于学会筛选和聚焦。',
    analysis: '抓住转折关系"不仅……反而……"和总结句"真正的智慧在于……"。',
    tags: '["模拟题","现代文"]',
  });

  await q({
    subject: 'chinese', category: '文言文', subCategory: '实词', type: 'choice',
    difficulty: 2, content: '下列句子中加点词的解释，不正确的一项是（  ）',
    options: ['学而时习之，不亦说乎？  说：通"悦"，愉快', '温故而知新，可以为师矣  故：旧的知识', '三人行，必有我师焉  三：三个', '知之为知之，不知为不知，是知也  知：通"智"，智慧'],
    answer: 'C',
    analysis: '"三"在这里是虚指，表示"几个"，不是确数"三个"。这是文言文中常见的虚指用法。',
    tags: '["基础巩固","文言文"]',
  });

  // ==================== 数学 ====================
  await q({
    subject: 'math', category: '函数', subCategory: '导数', type: 'short_answer',
    difficulty: 4, content: '已知函数 $f(x) = x^3 - 3x + 1$，求 $f(x)$ 的单调区间和极值。',
    answer: '$f\'(x) = 3x^2 - 3 = 3(x+1)(x-1)$\n\n单调递增区间：$(-\\infty, -1)$ 和 $(1, +\\infty)$\n单调递减区间：$(-1, 1)$\n\n极大值：$f(-1) = 3$，极小值：$f(1) = -1$',
    analysis: '求导后令 $f\'(x)=0$ 得驻点 $x=\\pm 1$，用列表法或数轴标根法判断符号。',
    tags: '["重点","函数"]',
  });

  await q({
    subject: 'math', category: '几何', subCategory: '解析几何', type: 'short_answer',
    difficulty: 5, content: '已知椭圆 $\\frac{x^2}{4} + y^2 = 1$，过点 $P(1, 0)$ 作直线 $l$ 交椭圆于 $A$、$B$ 两点，求 $\\triangle AOB$ 面积的最大值（$O$ 为原点）。',
    answer: '设直线 $l: x = my + 1$，代入椭圆方程得 $(m^2+4)y^2 + 2my - 3 = 0$\n\n$S_{\\triangle AOB} = \\frac{1}{2} |OP| \\cdot |y_A - y_B| = \\frac{1}{2} \\sqrt{(y_A+y_B)^2 - 4y_Ay_B}$\n\n当 $m = 0$ 时（即直线垂直于 $x$ 轴），$S_{max} = \\frac{\\sqrt{3}}{2}$',
    analysis: '设直线参数方程可以简化运算。注意讨论直线斜率不存在的情况。',
    tags: '["压轴题","几何"]',
  });

  await q({
    subject: 'math', category: '概率统计', subCategory: '古典概型', type: 'choice',
    difficulty: 2, content: '从 1, 2, 3, 4, 5 五个数中随机取出两个不同的数，其和为偶数的概率是（  ）',
    options: ['\\frac{1}{5}', '\\frac{2}{5}', '\\frac{3}{5}', '\\frac{4}{5}'],
    answer: 'B',
    analysis: '和为偶数：两个都是奇数或两个都是偶数。$P = \\frac{C_3^2 + C_2^2}{C_5^2} = \\frac{3+1}{10} = \\frac{2}{5}$',
    tags: '["基础巩固","概率"]',
  });

  await q({
    subject: 'math', category: '数列', subCategory: '求和', type: 'short_answer',
    difficulty: 3, content: '已知等差数列 $\\{a_n\\}$ 中，$a_1 = 1$，$a_3 + a_5 = 14$，求前 $n$ 项和 $S_n$。',
    answer: '设公差为 $d$，$a_3 + a_5 = (a_1 + 2d) + (a_1 + 4d) = 2a_1 + 6d = 14$\n\n解得 $d = 2$\n\n$a_n = 1 + 2(n-1) = 2n - 1$\n\n$S_n = na_1 + \\frac{n(n-1)}{2}d = n + n(n-1) = n^2$',
    analysis: '等差数列基本量法：利用已知条件求出首项和公差。',
    tags: '["基础巩固","数列"]',
  });

  await q({
    subject: 'math', category: '三角函数', subCategory: '三角函数', type: 'fill_blank',
    difficulty: 2, content: '已知 $\\sin\\alpha = \\frac{3}{5}$，$\\alpha \\in (\\frac{\\pi}{2}, \\pi)$，则 $\\cos\\alpha = $ ___，$\\tan\\alpha = $ ___。',
    answer: '$\\cos\\alpha = -\\frac{4}{5}$，$\\tan\\alpha = -\\frac{3}{4}$',
    analysis: '由 $\\sin^2\\alpha + \\cos^2\\alpha = 1$ 得 $\\cos\\alpha = \\pm\\frac{4}{5}$，因 $\\alpha$ 在第二象限，$\\cos\\alpha < 0$。',
    tags: '["基础巩固","三角函数"]',
  });

  // ==================== 英语 ====================
  await q({
    subject: 'english', category: '阅读理解', subCategory: '细节理解', type: 'choice',
    difficulty: 3, content: 'Read the passage and choose the best answer.\n\n"The rapid development of artificial intelligence has transformed many industries. While AI offers tremendous benefits, it also raises important ethical questions about privacy, employment, and decision-making."\n\nAccording to the passage, what is the main concern about AI?',
    options: ['It is too expensive to implement', 'It raises ethical questions', 'It is developing too slowly', 'It only benefits healthcare'],
    answer: 'B',
    analysis: '文中 "raises important ethical questions" 直接对应选项 B。',
    tags: '["模拟题","阅读理解"]',
  });

  await q({
    subject: 'english', category: '语法填空', subCategory: '时态', type: 'fill_blank',
    difficulty: 2, content: 'Fill in the blanks with the proper form of the given verbs:\n\n1. By the time we arrived, the meeting _______ (start) already.\n\n2. If I _______ (be) you, I would take the job.\n\n3. He suggested that we _______ (go) there by bus.',
    answer: '1. had started\n2. were\n3. (should) go',
    analysis: '1. 过去完成时（by the time + 过去时）\n2. 虚拟语气（与现在事实相反）\n3. suggest 后接虚拟语气 (should) + 动词原形',
    tags: '["重点","语法"]',
  });

  await q({
    subject: 'english', category: '完形填空', subCategory: '词义辨析', type: 'choice',
    difficulty: 3, content: 'She was so _____ in her work that she didn\'t hear the phone ringing.',
    options: ['absorbed', 'attracted', 'concentrated', 'focused'],
    answer: 'A',
    analysis: '"be absorbed in" 是固定搭配，意为"全神贯注于"。concentrate/focus 通常与 on 搭配。',
    tags: '["易错题","完形填空"]',
  });

  await q({
    subject: 'english', category: '写作', subCategory: '应用文', type: 'short_answer',
    difficulty: 3, content: '假设你是李华，你的英国笔友 Tom 来信询问你最喜欢的中国传统节日。请给他写一封回信，内容包括：\n1. 节日名称及时间\n2. 主要活动\n3. 你喜欢的原因\n\n注意：词数 100 左右。',
    answer: 'Dear Tom,\n\nI\'m glad to hear from you. My favorite Chinese traditional festival is the Spring Festival, which usually falls in January or February.\n\nDuring the festival, families get together to have a big dinner. We eat dumplings, set off fireworks, and give red envelopes to children. The streets are decorated with red lanterns, creating a warm and joyful atmosphere.\n\nI love it because it brings my whole family together and gives me a chance to relax after a busy year.\n\nYours,\nLi Hua',
    analysis: '注意书信格式（开头称呼、结尾落款），内容覆盖三个要点，语言简洁流畅。',
    tags: '["模拟题","写作"]',
  });

  // ==================== 物理 ====================
  await q({
    subject: 'physics', category: '力学', subCategory: '牛顿定律', type: 'short_answer',
    difficulty: 3, content: '一个质量为 $m = 2\\text{kg}$ 的物体放在光滑水平面上，受到水平力 $F = 10\\text{N}$ 的作用。求：\n(1) 物体的加速度\n(2) 物体在 $3\\text{s}$ 内的位移',
    answer: '(1) 由牛顿第二定律 $F = ma$：\n$a = \\frac{F}{m} = \\frac{10}{2} = 5\\text{m/s}^2$\n\n(2) 由运动学公式：\n$s = \\frac{1}{2}at^2 = \\frac{1}{2} \\times 5 \\times 3^2 = 22.5\\text{m}$',
    analysis: '光滑水平面意味着无摩擦力。直接应用牛顿第二定律和匀变速直线运动公式。',
    tags: '["基础巩固","力学"]',
  });

  await q({
    subject: 'physics', category: '电磁学', subCategory: '电路', type: 'choice',
    difficulty: 2, content: '如图所示电路，$R_1 = 4\\Omega$，$R_2 = 6\\Omega$，串联后接在 $U = 10\\text{V}$ 的电源上。则 $R_1$ 两端的电压为（  ）',
    options: ['4V', '6V', '5V', '10V'],
    answer: 'A',
    analysis: '串联电路电流相等：$I = \\frac{U}{R_1 + R_2} = \\frac{10}{10} = 1\\text{A}$\n$U_1 = IR_1 = 1 \\times 4 = 4\\text{V}$',
    tags: '["基础巩固","电磁学"]',
  });

  await q({
    subject: 'physics', category: '力学', subCategory: '能量', type: 'short_answer',
    difficulty: 4, content: '一个质量 $m = 1\\text{kg}$ 的物体从高度 $h = 5\\text{m}$ 的光滑斜面顶端由静止滑下，到达底端时速度为 $v = 8\\text{m/s}$。求摩擦力做的功。（$g = 10\\text{m/s}^2$）',
    answer: '由动能定理：$W_G + W_f = \\Delta E_k$\n\n$mgh + W_f = \\frac{1}{2}mv^2$\n\n$W_f = \\frac{1}{2}mv^2 - mgh = \\frac{1}{2} \\times 1 \\times 64 - 1 \\times 10 \\times 5 = 32 - 50 = -18\\text{J}$',
    analysis: '注意题目说"光滑斜面"但又有摩擦力，说明斜面并非完全光滑。摩擦力做负功。',
    tags: '["重点","力学"]',
  });

  // ==================== 化学 ====================
  await q({
    subject: 'chemistry', category: '无机化学', subCategory: '氧化还原', type: 'choice',
    difficulty: 2, content: '下列反应中，属于氧化还原反应的是（  ）',
    options: ['CaCO₃ + 2HCl = CaCl₂ + H₂O + CO₂↑', '2Na + 2H₂O = 2NaOH + H₂↑', 'NaOH + HCl = NaCl + H₂O', 'CaO + H₂O = Ca(OH)₂'],
    answer: 'B',
    analysis: '氧化还原反应的本质是电子转移（化合价变化）。B 中 Na 从 0→+1（被氧化），H 从 +1→0（被还原）。',
    tags: '["基础巩固","氧化还原"]',
  });

  await q({
    subject: 'chemistry', category: '无机化学', subCategory: '离子反应', type: 'short_answer',
    difficulty: 3, content: '写出下列反应的离子方程式：\n\n(1) 稀硫酸与氢氧化钡溶液反应\n\n(2) 碳酸钙与稀盐酸反应',
    answer: '(1) $2H^+ + SO_4^{2-} + Ba^{2+} + 2OH^- = BaSO_4\\downarrow + 2H_2O$\n\n(2) $CaCO_3 + 2H^+ = Ca^{2+} + H_2O + CO_2\\uparrow$',
    analysis: '(1) BaSO₄ 是沉淀不拆，H₂O 是弱电解质不拆。(2) CaCO₃ 是固体不拆。',
    tags: '["重点","离子反应"]',
  });

  await q({
    subject: 'chemistry', category: '有机化学', subCategory: '官能团', type: 'choice',
    difficulty: 3, content: '下列有机物中，能发生银镜反应的是（  ）',
    options: ['CH₃COOH', 'CH₃CHO', 'CH₃COOCH₃', 'CH₃CH₂OH'],
    answer: 'B',
    analysis: '能发生银镜反应说明含有醛基（-CHO）。B 乙醛含有醛基。A 羧基、C 酯基、D 羟基都不能发生银镜反应。',
    tags: '["易错题","有机化学"]',
  });

  // ==================== 生物 ====================
  await q({
    subject: 'biology', category: '细胞', subCategory: '结构', type: 'choice',
    difficulty: 2, content: '下列关于细胞膜的叙述，正确的是（  ）',
    options: ['细胞膜的主要成分是蛋白质和多糖', '细胞膜具有选择透过性', '细胞膜是完全不透性的', '所有细胞都有细胞核'],
    answer: 'B',
    analysis: 'A 错：主要成分是蛋白质和脂质（磷脂）。B 正确：细胞膜的功能特性是选择透过性。C 错：细胞膜是半透性的。D 错：原核细胞无成形的细胞核。',
    tags: '["基础巩固","细胞"]',
  });

  await q({
    subject: 'biology', category: '遗传', subCategory: '基因', type: 'short_answer',
    difficulty: 4, content: '一对表现正常的夫妇，生了一个患白化病的孩子（白化病为常染色体隐性遗传病）。\n(1) 写出父母和孩子的基因型\n(2) 他们再生一个正常孩子的概率是多少？',
    answer: '(1) 设正常基因为 A，白化基因为 a\n父亲：Aa，母亲：Aa，孩子：aa\n\n(2) Aa × Aa → AA:Aa:aa = 1:2:1\n正常概率 = 3/4',
    analysis: '父母正常但孩子患病，说明父母都是携带者（Aa）。注意问的是"正常孩子"的概率，不是"患病"的概率。',
    tags: '["重点","遗传"]',
  });

  await q({
    subject: 'biology', category: '生态', subCategory: '生态系统', type: 'fill_blank',
    difficulty: 2, content: '生态系统的主要功能是___和___。食物链中，营养级越高的生物，获得的能量越___。',
    answer: '物质循环、能量流动；少',
    analysis: '能量流动的特点是单向流动、逐营养级递减（传递效率约 10%-20%）。',
    tags: '["基础巩固","生态"]',
  });

  // ==================== 历史 ====================
  await q({
    subject: 'history', category: '中国古代史', subCategory: '秦汉', type: 'choice',
    difficulty: 2, content: '秦始皇统一六国后，为巩固统一采取的措施不包括（  ）',
    options: ['统一文字为小篆', '统一度量衡', '实行分封制', '修建长城'],
    answer: 'C',
    analysis: '秦始皇废分封、行郡县，C 项错误。A、B、D 都是秦始皇巩固统一的措施。',
    tags: '["基础巩固","中国古代史"]',
  });

  await q({
    subject: 'history', category: '中国近代史', subCategory: '五四运动', type: 'short_answer',
    difficulty: 3, content: '五四运动的历史意义是什么？',
    answer: '① 是一次彻底的反帝反封建的爱国运动\n② 工人阶级开始登上政治舞台\n③ 促进了马克思主义在中国的传播\n④ 是中国新民主主义革命的开端',
    analysis: '五四运动的"彻底性"体现在不妥协的斗争精神。注意区分旧民主主义革命和新民主主义革命的分界线。',
    tags: '["重点","中国近代史"]',
  });

  await q({
    subject: 'history', category: '世界史', subCategory: '工业革命', type: 'choice',
    difficulty: 3, content: '第一次工业革命首先发生在英国的原因不包括（  ）',
    options: ['资本主义制度的确立', '海外殖民扩张和掠夺', '丰富的煤炭铁矿资源', '电力的广泛使用'],
    answer: 'D',
    analysis: '电力的广泛使用是第二次工业革命的标志，不是第一次工业革命的原因。',
    tags: '["易错题","世界史"]',
  });

  // ==================== 地理 ====================
  await q({
    subject: 'geography', category: '自然地理', subCategory: '气候', type: 'choice',
    difficulty: 3, content: '下列气候类型中，雨热同期的是（  ）',
    options: ['地中海气候', '温带海洋性气候', '温带季风气候', '热带沙漠气候'],
    answer: 'C',
    analysis: '温带季风气候夏季高温多雨、冬季寒冷干燥，雨热同期。地中海气候雨热不同期（夏季炎热干燥，冬季温和多雨）。',
    tags: '["重点","气候"]',
  });

  await q({
    subject: 'geography', category: '人文地理', subCategory: '城市', type: 'short_answer',
    difficulty: 3, content: '分析影响城市区位的主要自然因素和社会经济因素各举两例。',
    answer: '自然因素：① 地形（平原地区城市密集）② 气候（温和湿润地区城市多）\n\n社会经济因素：① 交通（交通枢纽易形成城市）② 资源（矿产资源丰富地区兴起工矿城市）',
    analysis: '答题时注意分类作答，每个因素配以简要说明。',
    tags: '["模拟题","人文地理"]',
  });

  // ==================== 政治 ====================
  await q({
    subject: 'politics', category: '经济生活', subCategory: '消费', type: 'choice',
    difficulty: 2, content: '下列属于避免盲从、理性消费的是（  ）',
    options: ['跟风购买最新款手机', '只买贵的不买对的', '根据自己的实际需要购买商品', '借钱超前消费'],
    answer: 'C',
    analysis: '理性消费要求量入为出、适度消费，避免盲目跟风和攀比。C 项体现了根据实际需要消费。',
    tags: '["基础巩固","经济生活"]',
  });

  await q({
    subject: 'politics', category: '哲学', subCategory: '辩证法', type: 'short_answer',
    difficulty: 4, content: '用矛盾的观点分析"失败是成功之母"这句话蕴含的哲学道理。',
    answer: '① 矛盾双方在一定条件下可以相互转化。失败和成功是矛盾的双方，失败可以转化为成功。\n\n② 矛盾的同一性：失败和成功相互依存，没有失败就无所谓成功。\n\n③ 转化需要条件：从失败到成功需要总结经验教训、不断努力。',
    analysis: '矛盾观包括：矛盾的普遍性、特殊性、同一性、斗争性。本题主要考查同一性（相互转化）。',
    tags: '["重点","哲学"]',
  });

  // ===== 创建示例试卷 =====
  const allQuestions = await prisma.question.findMany({ orderBy: { createdAt: 'asc' } });
  const chineseQs = allQuestions.filter(q => q.subject === 'chinese');
  const mathQs = allQuestions.filter(q => q.subject === 'math');

  if (chineseQs.length > 0) {
    const paper1 = await prisma.examPaper.create({
      data: {
        id: uuid(), title: '语文基础知识小测', subject: 'chinese',
        description: '古诗词默写 + 文言文 + 现代文阅读',
        totalScore: 50, showAnalysis: true, showAnswer: true,
        answerAreaLines: 5, fontSize: 14,
        headerText: '高三年级 语文练习卷',
        createdAt: now, updatedAt: now,
      }
    });
    for (let i = 0; i < chineseQs.length; i++) {
      await prisma.paperQuestion.create({
        data: { id: uuid(), paperId: paper1.id, questionId: chineseQs[i].id, order: i + 1, score: 10 }
      });
    }
  }

  if (mathQs.length > 0) {
    const paper2 = await prisma.examPaper.create({
      data: {
        id: uuid(), title: '数学函数与导数专项', subject: 'math',
        description: '导数、三角函数、数列综合训练',
        totalScore: 60, showAnalysis: false, showAnswer: false,
        answerAreaLines: 8, fontSize: 14,
        headerText: '高三年级 数学周练',
        createdAt: now, updatedAt: now,
      }
    });
    for (let i = 0; i < mathQs.length; i++) {
      await prisma.paperQuestion.create({
        data: { id: uuid(), paperId: paper2.id, questionId: mathQs[i].id, order: i + 1, score: 15 }
      });
    }
  }

  const count = await prisma.question.count();
  console.log(`✅ 完成！共写入 ${count} 道题目，覆盖 9 个学科`);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
