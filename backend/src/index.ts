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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 题库后端已启动: http://localhost:${PORT}`);
});
