/**
 * 答题判断工具函数
 * - 选择题/判断题：精确匹配（多选排序后比较）
 * - 填空题：逐空精确匹配
 * - 简答/论述：关键词匹配（宽松模式）
 */

/**
 * 标准化答案字符串：去首尾空格、转大写、统一标点
 */
function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toUpperCase()
    .replace(/[\s\u3000]+/g, ' ') // 全角空格 → 半角
    .replace(/，/g, ',')
    .replace(/。/g, '.')
    .replace(/；/g, ';')
    .replace(/：/g, ':')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/【/g, '[')
    .replace(/】/g, ']');
}

/**
 * 判断选择题/判断题答案是否正确
 * - 多选题：排序后比较（"CBA" === "ABC"）
 * - 单选题/判断题：直接比较
 */
function checkChoiceAnswer(userAnswer: string, correctAnswer: string, isMulti: boolean): boolean {
  const user = normalizeAnswer(userAnswer);
  const correct = normalizeAnswer(correctAnswer);

  if (isMulti) {
    // 多选：排序后比较
    const userSorted = user.split('').sort().join('');
    const correctSorted = correct.split('').sort().join('');
    return userSorted === correctSorted;
  }

  return user === correct;
}

/**
 * 判断填空题答案是否正确
 * - 按空逐个比较，每空必须精确匹配
 * - 支持多空用 | 分隔，也支持答案中用 ; 或换行分隔
 */
function checkFillBlankAnswer(userAnswer: string, correctAnswer: string): boolean {
  const user = normalizeAnswer(userAnswer);
  const correct = normalizeAnswer(correctAnswer);

  // 拆分多个空的答案
  const correctParts = correct.split(/[|;；\n]/).map(s => s.trim()).filter(Boolean);
  const userParts = user.split(/[|;；\n]/).map(s => s.trim()).filter(Boolean);

  if (correctParts.length === 0) return false;

  // 如果只有一个空，直接精确比较
  if (correctParts.length === 1) {
    return user === correct;
  }

  // 多空：逐空比较，允许用户少答（按已答部分算）
  if (userParts.length < correctParts.length) return false;
  return correctParts.every((part, i) => userParts[i] === part);
}

/**
 * 判断简答/论述题答案是否正确
 * - 提取关键词，要求全部关键词都出现在用户答案中
 * - 关键词按 ; ； 换行 分隔（不再用逗号分隔，避免误拆）
 */
function checkShortAnswerAnswer(userAnswer: string, correctAnswer: string): boolean {
  const user = normalizeAnswer(userAnswer);
  const correct = normalizeAnswer(correctAnswer);

  // 提取关键词：按换行、分号分隔
  const keywords = correct.split(/[;；\n]/).map(s => s.trim()).filter(Boolean);

  if (keywords.length === 0) {
    // 没有明确关键词，回退到完全匹配
    return user === correct;
  }

  // 全部关键词都必须出现
  return keywords.every(k => user.includes(k));
}

/**
 * 统一的答题判断入口
 */
export function checkAnswer(
  userAnswer: string,
  correctAnswer: string,
  questionType: string
): boolean {
  if (!userAnswer || !correctAnswer) return false;

  switch (questionType) {
    case 'choice':
      return checkChoiceAnswer(userAnswer, correctAnswer, false);
    case 'multi_choice':
      return checkChoiceAnswer(userAnswer, correctAnswer, true);
    case 'true_false':
      return checkChoiceAnswer(userAnswer, correctAnswer, false);
    case 'fill_blank':
      return checkFillBlankAnswer(userAnswer, correctAnswer);
    case 'short_answer':
    case 'essay':
    default:
      return checkShortAnswerAnswer(userAnswer, correctAnswer);
  }
}
