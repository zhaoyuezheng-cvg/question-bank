import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

/**
 * 记录用户操作日志
 */
export async function logOperation(opts: {
  userId: string;
  action: string;
  targetType: string;
  targetId?: string;
  detail?: string;
}): Promise<void> {
  try {
    await prisma.operationLog.create({
      data: {
        id: uuid(),
        userId: opts.userId,
        action: opts.action,
        targetType: opts.targetType,
        targetId: opts.targetId,
        detail: opts.detail,
        createdAt: Math.floor(Date.now() / 1000),
      },
    });
  } catch {}
}

/**
 * 获取用户操作历史
 */
export async function getOperationLogs(userId: string, limit: number = 50) {
  return prisma.operationLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
