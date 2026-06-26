import prisma from '../prisma';
import { v4 as uuid } from 'uuid';

export async function auditLog(params: {
  userId?: string | null;
  action: string;
  target: string;
  targetId?: string | null;
  detail?: string;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        id: uuid(),
        userId: params.userId || null,
        action: params.action,
        target: params.target,
        targetId: params.targetId || null,
        detail: params.detail || null,
        ip: params.ip || null,
        createdAt: Math.floor(Date.now() / 1000),
      },
    });
  } catch {
    // 审计日志写入失败不应阻断主流程
  }
}
