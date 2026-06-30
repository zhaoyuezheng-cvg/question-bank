import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { auditLog } from '../utils/audit';

export const authRouter = Router();

// Simple JWT implementation (no external dependency)
const JWT_SECRET = process.env.JWT_SECRET || 'question-bank-secret-key-change-in-production';

function base64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function createToken(payload: any): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 7 * 24 * 3600; // 7天过期
  const body = base64url(JSON.stringify({ ...payload, iat, exp }));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expected = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${parts[0]}.${parts[1]}`)
    .digest('base64url');
  if (expected !== parts[2]) return null;
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload;
}

// 缓存 userCount，避免每次请求查库
let cachedUserCount: number | null = null;
let userCountCacheTime = 0;
const USER_COUNT_CACHE_TTL = 60_000; // 60秒缓存

function invalidateUserCountCache() {
  cachedUserCount = null;
}

async function getUserCount(): Promise<number> {
  const now = Date.now();
  if (cachedUserCount !== null && now - userCountCacheTime < USER_COUNT_CACHE_TTL) {
    return cachedUserCount;
  }
  cachedUserCount = await prisma.user.count();
  userCountCacheTime = now;
  return cachedUserCount;
}

// Auth middleware
export function authMiddleware(req: Request, res: Response, next: Function) {
  // Skip auth for login/register and health check
  if (req.path === '/api/auth/login' || req.path === '/api/auth/register' || req.path === '/api/health') {
    return next();
  }

  // Skip if no users exist (first run)
  getUserCount().then(count => {
    if (count === 0) return next();

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '请先登录' });
    }

    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded) {
      return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
    }

    (req as any).userId = decoded.userId;
    (req as any).userRole = decoded.role;
    next();
  }).catch((err) => {
    console.error('[Auth Error]', err.message);
    return res.status(500).json({ success: false, error: '认证服务异常' });
  });
}

// POST /api/auth/register - 注册（仅管理员可创建新用户，或首次无用户时创建管理员）
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: '密码至少8位' });
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ success: false, error: '密码需包含字母和数字' });
    }

    const userCount = await prisma.user.count();
    let userRole = 'user';

    if (userCount === 0) {
      // First user is admin
      userRole = 'admin';
    } else {
      // Check if requester is admin
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(403).json({ success: false, error: '需要管理员权限' });
      }
      const decoded = verifyToken(authHeader.slice(7));
      if (!decoded || decoded.role !== 'admin') {
        return res.status(403).json({ success: false, error: '只有管理员可以创建用户' });
      }
      userRole = role || 'user';
    }

    // Check duplicate
    const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (existing) {
      return res.status(400).json({ success: false, error: '用户名已存在' });
    }

    // Hash password
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const passwordHash = `${salt}:${hash}`;

    const now = Math.floor(Date.now() / 1000);
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        username: username.trim(),
        passwordHash,
        role: userRole,
        createdAt: now,
      },
    });

    await auditLog({ userId: user.id, action: 'register', target: 'user', targetId: user.id, detail: `${user.username} (${user.role})`, ip: req.ip });
    invalidateUserCountCache();

    res.status(201).json({
      success: true,
      data: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login - 登录
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ success: false, error: '请输入用户名和密码' });
    }

    const user = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (!user) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    const [salt, storedHash] = user.passwordHash.split(':');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    if (hash !== storedHash) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    const token = createToken({ userId: user.id, username: user.username, role: user.role });

    await auditLog({ userId: user.id, action: 'login', target: 'user', targetId: user.id, ip: req.ip });

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, role: user.role },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me - 获取当前用户信息
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.json({ success: true, data: null });
    }
    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded) return res.json({ success: true, data: null });

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, role: true, createdAt: true },
    });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/users - 获取用户列表（仅管理员）
authRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(403).json({ success: false, error: '需要管理员权限' });
    }
    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ success: false, error: '需要管理员权限' });
    }

    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/auth/users/:id - 删除用户（仅管理员）
authRouter.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(403).json({ success: false, error: '需要管理员权限' });
    }
    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ success: false, error: '需要管理员权限' });
    }

    if (decoded.userId === req.params.id) {
      return res.status(400).json({ success: false, error: '不能删除自己' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    await auditLog({ userId: decoded.userId, action: 'delete', target: 'user', targetId: req.params.id, ip: req.ip });
    invalidateUserCountCache();
    res.json({ success: true, message: '已删除' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/audit-logs - 审计日志（仅管理员）
authRouter.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(403).json({ success: false, error: '需要管理员权限' });
    }
    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ success: false, error: '需要管理员权限' });
    }

    const { page = '1', pageSize = '50', action, target } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const size = Math.min(200, Math.max(1, parseInt(pageSize)));

    const where: any = {};
    if (action) where.action = action;
    if (target) where.target = target;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (pageNum - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/change-password - 修改密码
authRouter.post('/change-password', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '请先登录' });
    }
    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded) {
      return res.status(401).json({ success: false, error: '登录已过期' });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: '请填写当前密码和新密码' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: '新密码至少8位' });
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, error: '新密码需包含字母和数字' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    // 验证当前密码
    const [salt, storedHash] = user.passwordHash.split(':');
    const hash = crypto.scryptSync(oldPassword, salt, 64).toString('hex');
    if (hash !== storedHash) {
      return res.status(401).json({ success: false, error: '当前密码错误' });
    }

    // 更新密码
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = crypto.scryptSync(newPassword, newSalt, 64).toString('hex');
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash: `${newSalt}:${newHash}` },
    });

    await auditLog({ userId: decoded.userId, action: 'update', target: 'user', targetId: decoded.userId, detail: '修改密码', ip: req.ip });

    res.json({ success: true, message: '密码修改成功' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
