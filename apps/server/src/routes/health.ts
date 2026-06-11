import { Router } from 'express';
import { getFirebaseAdminConfigStatus } from '../services/firebaseAdmin';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'six3',
    firebaseAdmin: getFirebaseAdminConfigStatus(),
    firebaseApiKeyConfigured: Boolean(process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY),
  });
});

healthRouter.get('/api/status', (_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' });
});
