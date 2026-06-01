import { Router } from 'express';
import { z } from 'zod';
import { requireActiveSubscription } from './auth';

export const leadRouter = Router();

const exportSchema = z.object({ eventId: z.string().optional() });

leadRouter.post('/export', requireActiveSubscription, (req, res, next) => {
  try {
    exportSchema.parse(req.body);
    const csv = 'name,phone,email,instagram,source,createdAt\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(csv);
  } catch (e) { next(e); }
});
