import { Router } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';

export const qrRouter = Router();

const querySchema = z.object({ url: z.string().url() });

qrRouter.get('/event/:slug', async (req, res, next) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const url = `${baseUrl}/g/${req.params.slug}`;
    const qr = await QRCode.toDataURL(url, { width: 400, margin: 2 });
    res.json({ qr, url });
  } catch (e) { next(e); }
});

qrRouter.get('/video/:id', async (req, res, next) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { slug } = req.query as { slug?: string };
    const url = `${baseUrl}/g/${slug || 'event'}/${req.params.id}`;
    const qr = await QRCode.toDataURL(url, { width: 400, margin: 2 });
    res.json({ qr, url });
  } catch (e) { next(e); }
});

qrRouter.post('/generate', async (req, res, next) => {
  try {
    const { url } = querySchema.parse(req.body);
    const qr = await QRCode.toDataURL(url, { width: 400, margin: 2 });
    res.json({ qr, url });
  } catch (e) { next(e); }
});
