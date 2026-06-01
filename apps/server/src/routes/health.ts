import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', app: 'six3' });
});

healthRouter.get('/api/status', (_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' });
});
