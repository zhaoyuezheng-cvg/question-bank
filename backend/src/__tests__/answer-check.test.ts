/**
 * 答题判断逻辑测试
 * 运行: npx tsx src/__tests__/answer-check.test.ts
 */
import { checkAnswer } from '../utils/answer-check';

let passed = 0;
let failed = 0;

function assert(name: string, actual: boolean, expected: boolean) {
  if (actual === expected) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name}: expected ${expected}, got ${actual}`);
  }
}

console.log('\n=== 选择题 ===');
assert('单选正确', checkAnswer('A', 'A', 'choice'), true);
assert('单选错误', checkAnswer('B', 'A', 'choice'), false);
assert('单选大小写', checkAnswer('a', 'A', 'choice'), true);
assert('判断正确', checkAnswer('对', '对', 'true_false'), true);
assert('判断错误', checkAnswer('错', '对', 'true_false'), false);

console.log('\n=== 多选题 ===');
assert('多选正确顺序', checkAnswer('ABC', 'ABC', 'multi_choice'), true);
assert('多选正确乱序', checkAnswer('CBA', 'ABC', 'multi_choice'), true);
assert('多选错误', checkAnswer('ABD', 'ABC', 'multi_choice'), false);
assert('多选漏选', checkAnswer('AB', 'ABC', 'multi_choice'), false);

console.log('\n=== 填空题 ===');
assert('填空单空正确', checkAnswer('光合作用', '光合作用', 'fill_blank'), true);
assert('填空单空错误', checkAnswer('呼吸作用', '光合作用', 'fill_blank'), false);
assert('填空多空正确', checkAnswer('A|B|C', 'A|B|C', 'fill_blank'), true);
assert('填空多空错误', checkAnswer('A|B', 'A|B|C', 'fill_blank'), false);
assert('填空多空分号', checkAnswer('A;B;C', 'A;B;C', 'fill_blank'), true);

console.log('\n=== 简答题 ===');
assert('简答关键词全包含', checkAnswer('光合作用需要光照和叶绿体', '光合作用;叶绿体', 'short_answer'), true);
assert('简答关键词部分包含', checkAnswer('光合作用需要光照', '光合作用;叶绿体', 'short_answer'), false);
assert('简答完全匹配', checkAnswer('答案', '答案', 'short_answer'), true);

console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);
