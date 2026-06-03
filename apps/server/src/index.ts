import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { healthRouter } from './routes/health';
import { uploadRouter } from './routes/upload';
import { videoRouter } from './routes/video';
import { templatesRouter } from './routes/templates';
import { qrRouter } from './routes/qr';
import { leadRouter } from './routes/leads';
import { trackRouter } from './routes/track';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { billingRouter, pixgoWebhookHandler, stripeWebhookHandler } from './routes/billing';
import { supportRouter } from './routes/support';
import { eventsRouter } from './routes/events';
import { notificationsRouter } from './routes/notifications';
import { musicRouter } from './routes/music';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = Number(process.env.PORT) || 3333;

function parseOrigins(value?: string) {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
  ...parseOrigins(process.env.CORS_ORIGINS),
].filter(Boolean) as string[]);

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;

  try {
    const url = new URL(origin);
    return (
      process.env.ALLOW_VERCEL_PREVIEWS !== 'false' &&
      url.protocol === 'https:' &&
      url.hostname.endsWith('.vercel.app')
    );
  } catch {
    return false;
  }
}

function memoryGuardLimitMb() {
  const configured = Number(process.env.MEMORY_GUARD_RSS_MB);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return process.env.RENDER ? 420 : 0;
}

function memoryPressureGuard(_req: Request, res: Response, next: NextFunction) {
  const limitMb = memoryGuardLimitMb();
  if (!limitMb) {
    next();
    return;
  }

  const rssMb = process.memoryUsage().rss / 1024 / 1024;
  if (rssMb < limitMb) {
    next();
    return;
  }

  res.setHeader('Retry-After', '30');
  res.status(503).json({
    error: 'SERVER_MEMORY_PRESSURE',
    code: 'SERVER_MEMORY_PRESSURE',
    message: 'Servidor protegendo a instancia. Tente novamente em alguns segundos.',
  });
}

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: false,
}));
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);
app.post('/api/webhooks/pixgo', express.raw({ type: 'application/json' }), pixgoWebhookHandler);
app.post('/api/billing/pixgo/webhook', express.raw({ type: 'application/json' }), pixgoWebhookHandler);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use('/api', memoryPressureGuard);

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/billing', billingRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/video', videoRouter);
app.use('/api/videos', videoRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/qr', qrRouter);
app.use('/api/leads', leadRouter);
app.use('/api/track', trackRouter);
app.use('/api/support', supportRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/music', musicRouter);

app.use(errorHandler);

// Only start HTTP server when running locally (not in Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[server] Running on http://localhost:${PORT}`);
    console.log(`[server] Public URL: ${process.env.PUBLIC_BACKEND_URL || 'not set'}`);
  });
}

export default app;
