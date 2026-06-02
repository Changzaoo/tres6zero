import 'dotenv/config';
import express from 'express';
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
import { billingRouter, stripeWebhookHandler } from './routes/billing';
import { supportRouter } from './routes/support';
import { eventsRouter } from './routes/events';
import { notificationsRouter } from './routes/notifications';
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/billing', billingRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/video', videoRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/qr', qrRouter);
app.use('/api/leads', leadRouter);
app.use('/api/track', trackRouter);
app.use('/api/support', supportRouter);
app.use('/api/notifications', notificationsRouter);

app.use(errorHandler);

// Only start HTTP server when running locally (not in Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[server] Running on http://localhost:${PORT}`);
    console.log(`[server] Public URL: ${process.env.PUBLIC_BACKEND_URL || 'not set'}`);
  });
}

export default app;
