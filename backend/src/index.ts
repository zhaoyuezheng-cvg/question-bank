import express from 'express';
import cors from 'cors';
import { questionRouter } from './routes/questions';
import { paperRouter } from './routes/papers';
import { tagRouter } from './routes/tags';
import { categoryRouter } from './routes/categories';
import { importRouter } from './routes/import';
import { practiceRouter } from './routes/practice';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/questions', questionRouter);
app.use('/api/papers', paperRouter);
app.use('/api/tags', tagRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/import', importRouter);
app.use('/api/practice', practiceRouter);

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
