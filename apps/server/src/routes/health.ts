import { Router } from 'express';
import os from 'os';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    platform: os.platform(),
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/api/status', (_req, res) => {
  res.json({
    online: true,
    uptime: Math.floor(process.uptime()),
    firebase: 'configured',
    storage: 'firebase',
    version: '1.0.0',
  });
});
