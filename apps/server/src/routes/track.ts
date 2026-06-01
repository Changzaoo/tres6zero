import { Router } from 'express';
import { z } from 'zod';

export const trackRouter = Router();

const trackSchema = z.object({
  type: z.enum(['view', 'download', 'share']),
  eventId: z.string().optional(),
  videoId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

trackRouter.post('/', (req, res, next) => {
  try {
    const data = trackSchema.parse(req.body);
    console.log('[track]', data);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
