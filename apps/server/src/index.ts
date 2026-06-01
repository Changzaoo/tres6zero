import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { healthRouter } from './routes/health';
import { uploadRouter } from './routes/upload';
import { videoRouter } from './routes/video';
import { qrRouter } from './routes/qr';
import { leadRouter } from './routes/leads';
import { trackRouter } from './routes/track';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3333;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://tres6zero-server.vercel.app',
  process.env.FRONTEND_URL,
  process.env.PUBLIC_BACKEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter(Boolean) as string[];

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));

app.use('/health', healthRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/video', videoRouter);
app.use('/api/qr', qrRouter);
app.use('/api/leads', leadRouter);
app.use('/api/track', trackRouter);

app.use(errorHandler);

// Only start HTTP server when running locally (not in Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[server] Running on http://localhost:${PORT}`);
    console.log(`[server] Public URL: ${process.env.PUBLIC_BACKEND_URL || 'not set'}`);
  });
}

export default app;
