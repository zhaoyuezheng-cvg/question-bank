/**
 * SQLite FTS5 全文搜索工具
 * - 自动创建 FTS5 虚拟表
 * - 提供搜索接口
 */
import prisma from '../prisma';

let ftsAvailable = false;

/**
 * 初始化 FTS5 虚拟表
 */
export async function initFTS(): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE VIRTUAL TABLE IF NOT EXISTS questions_fts USING fts5(
        content,
        answer,
        analysis,
        tags,
        content='question',
        content_rowid='rowid'
      );
    `);

    // Populate FTS table
    await prisma.$executeRawUnsafe(`
      INSERT OR REPLACE INTO questions_fts(rowid, content, answer, analysis, tags)
      SELECT rowid, content, answer, analysis, COALESCE(tags, '') FROM question;
    `);

    ftsAvailable = true;
    console.log('[FTS5] 全文搜索索引已创建');
    return true;
  } catch (err: any) {
    console.log('[FTS5] 不可用，回退到 LIKE 搜索:', err.message);
    ftsAvailable = false;
    return false;
  }
}

/**
 * 刷新 FTS 索引（题目变更后调用）
 */
export async function refreshFTS(): Promise<void> {
  if (!ftsAvailable) return;
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM questions_fts;`);
    await prisma.$executeRawUnsafe(`
      INSERT INTO questions_fts(rowid, content, answer, analysis, tags)
      SELECT rowid, content, answer, analysis, COALESCE(tags, '') FROM question;
    `);
  } catch {}
}

/**
 * 全文搜索
 */
export async function searchQuestions(keyword: string, limit: number = 50): Promise<string[]> {
  if (!ftsAvailable) return [];

  try {
    const rows = await prisma.$queryRawUnsafe<{ rowid: number }[]>(
      `SELECT rowid FROM questions_fts WHERE questions_fts MATCH ? LIMIT ?`,
      keyword,
      limit
    );

    if (rows.length === 0) return [];

    // Get actual question IDs from rowids
    const questions = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM question WHERE rowid IN (${rows.map(() => '?').join(',')})`,
      ...rows.map(r => r.rowid)
    );

    return questions.map(q => q.id);
  } catch {
    return [];
  }
}

export function isFTSAvailable() {
  return ftsAvailable;
}
