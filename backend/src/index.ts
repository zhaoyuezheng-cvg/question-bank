import express from 'express';
import cors from 'cors';
import path from 'path';
import { questionRouter } from './routes/questions';
import { paperRouter } from './routes/papers';
import { tagRouter } from './routes/tags';
import { categoryRouter } from './routes/categories';
import { importRouter } from './routes/import';
import { practiceRouter } from './routes/practice';
import { uploadRouter } from './routes/upload';
import { examRouter } from './routes/exam';
import { flashcardRouter } from './routes/flashcard';
import { recommendRouter } from './routes/recommend';
import { backupRouter } from './routes/backup';
import { templateRouter } from './routes/templates';
import { passageRouter } from './routes/passages';
import { aiRouter } from './routes/ai';
import { authRouter, authMiddleware } from './routes/auth';
import { studyRouter } from './routes/study';
import { textbookRouter } from './routes/textbooks';
import { wordRouter } from './routes/words';
import { exportRouter } from './routes/export';
import { initFTS } from './utils/fts';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// JWT 安全检查
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'question-bank-secret-key-change-in-production')) {
  console.warn('⚠️  [Security] 生产环境请务必设置 JWT_SECRET 环境变量！');
}

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '请求过于频繁，请稍后再试' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 100,
  message: { success: false, error: '登录尝试过多，请稍后再试' },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate limiter on API
app.use('/api/', apiLimiter);

// API Docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customCss: '.swagger-ui .topbar { display: none }', customSiteTitle: '题库 API 文档' }));
app.get('/api/docs.json', (_req, res) => { res.json(swaggerSpec); });

// Auth & public routes (no auth required)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRouter);

// Auth middleware (skips login/register/health)
app.use(authMiddleware);

// Protected routes (auth required)
app.use('/api/questions', questionRouter);
app.use('/api/papers', paperRouter);
app.use('/api/tags', tagRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/import', importRouter);
app.use('/api/practice', practiceRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/exam', examRouter);
app.use('/api/flashcards', flashcardRouter);
app.use('/api/recommend', recommendRouter);
app.use('/api/backup', backupRouter);
app.use('/api/templates', templateRouter);
app.use('/api/passages', passageRouter);
app.use('/api/ai', aiRouter);
app.use('/api/study', studyRouter);
app.use('/api/textbooks', textbookRouter);
app.use('/api/words', wordRouter);
app.use('/api/export', exportRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  if (isProd) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  } else {
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 题库后端已启动: http://localhost:${PORT}`);
  console.log(`📖 API 文档: http://localhost:${PORT}/api/docs`);
  await initFTS();
});
