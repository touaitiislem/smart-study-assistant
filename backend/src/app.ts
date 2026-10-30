import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler, HttpError } from './errors';
import { authRouter } from './routes/auth';
import { coursesRouter } from './routes/courses';
import { documentsRouter } from './routes/documents';
import { aiRouter } from './routes/ai';
import { quizzesRouter } from './routes/quizzes';
import { tasksRouter } from './routes/tasks';
import { conversationsRouter } from './routes/conversations';
import { statsRouter } from './routes/stats';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600 }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter);
  app.use('/api/courses', coursesRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/quizzes', quizzesRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api', documentsRouter);

  app.use((_req, _res, next) => next(new HttpError(404, 'Route introuvable.')));
  app.use(errorHandler);
  return app;
}
