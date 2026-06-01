import { Router } from 'express';
import { z } from 'zod';
import { processVideo, getAvailableEffects } from '../services/videoProcessor';
import { requireActiveSubscription } from './auth';

export const videoRouter = Router();

const processSchema = z.object({
  videoId: z.string(),
  templateId: z.string().optional(),
  effect: z.string().optional(),
  music: z.string().optional(),
  overlay: z.string().optional(),
});

videoRouter.post('/process', requireActiveSubscription, async (req, res, next) => {
  try {
    const config = processSchema.parse(req.body);
    const result = await processVideo(config);
    res.json(result);
  } catch (e) { next(e); }
});

videoRouter.get('/effects', (_req, res) => {
  res.json({ effects: getAvailableEffects() });
});
