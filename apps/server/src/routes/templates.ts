import { Router } from 'express';
import { z } from 'zod';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';
import { requireAdmin, requireActiveSubscription } from './auth';
import { buildGeneratedTemplates } from '../services/generatedTemplates';
import { uploadBufferToSupabase } from '../services/supabaseStorage';

export const templatesRouter = Router();

const seedSchema = z.object({
  count: z.number().int().min(1).max(240).optional(),
});

templatesRouter.get('/generated', requireActiveSubscription, (_req, res) => {
  const templates = buildGeneratedTemplates().map(({ svg, ...template }) => template);
  res.json({ templates });
});

templatesRouter.post('/seed-transparent', requireAdmin, async (req, res, next) => {
  try {
    const { count = 216 } = seedSchema.parse(req.body || {});
    const templates = buildGeneratedTemplates(count);
    const uploaded = [];

    for (const template of templates) {
      const pngBuffer = await sharp(Buffer.from(template.svg), { density: 180 }).png().toBuffer();
      const result = await uploadBufferToSupabase({
        bucket: 'templates',
        prefix: `generated/${template.category}`,
        fileName: `${template.id}.png`,
        fallbackExt: '.png',
        buffer: pngBuffer,
        contentType: 'image/png',
      });

      const { svg, ...publicTemplate } = template;
      uploaded.push({
        ...publicTemplate,
        overlayUrl: result.publicUrl,
        storagePath: result.path,
      });
    }

    res.json({ templates: uploaded });
  } catch (e) { next(e); }
});
