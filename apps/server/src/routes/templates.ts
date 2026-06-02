import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import { requireAdmin, requireActiveSubscription } from './auth';
import { buildGeneratedTemplates, renderTemplatePng } from '../services/generatedTemplates';
import { buildGeneratedMusic, renderMusicWav } from '../services/generatedMusic';
import { ensurePublicBucket, publicUrl, SUPABASE_BUCKETS, uploadBufferToSupabase } from '../services/supabaseStorage';

export const templatesRouter = Router();

const seedSchema = z.object({
  count: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).max(10000).optional(),
  musicCount: z.number().int().min(0).max(120).optional(),
});

templatesRouter.get('/generated', requireActiveSubscription, (_req, res) => {
  const templates = buildGeneratedTemplates().map(({ svg, ...template }) => ({
    ...template,
    overlayUrl: publicUrl(SUPABASE_BUCKETS.projectTemplates, template.storagePath),
  }));
  res.json({ templates });
});

templatesRouter.get('/generated-music', requireActiveSubscription, (_req, res) => {
  const music = buildGeneratedMusic().map(({ baseFrequency, ...item }) => ({
    ...item,
    musicUrl: publicUrl(SUPABASE_BUCKETS.projectMusic, item.storagePath),
  }));
  res.json({ music });
});

function hasSeedSecret(req: Request) {
  const configured = process.env.SIX3_SEED_SECRET;
  const provided = req.get('x-six3-seed-secret') || '';
  if (!configured || !provided) return false;

  const configuredBuffer = Buffer.from(configured);
  const providedBuffer = Buffer.from(provided);
  return configuredBuffer.length === providedBuffer.length && timingSafeEqual(configuredBuffer, providedBuffer);
}

function requireSeedSecret(req: Request, res: Response, next: NextFunction) {
  if (hasSeedSecret(req)) {
    next();
    return;
  }

  res.status(403).json({ error: 'SEED_SECRET_REQUIRED' });
}

async function uploadProjectTemplates(count: number, offset = 0) {
  await ensurePublicBucket(SUPABASE_BUCKETS.projectTemplates);
  const templates = buildGeneratedTemplates(count, offset);
  const uploaded = [];

  for (const template of templates) {
    const result = await uploadBufferToSupabase({
      bucket: SUPABASE_BUCKETS.projectTemplates,
      prefix: `generated/${template.category}`,
      fileName: `${template.id}.png`,
      fallbackExt: '.png',
      buffer: await renderTemplatePng(template.svg),
      contentType: 'image/png',
      objectPath: template.storagePath,
      upsert: true,
    });

    const { svg, ...publicTemplate } = template;
    uploaded.push({
      ...publicTemplate,
      overlayUrl: result.publicUrl,
      storagePath: result.path,
    });
  }

  return uploaded;
}

async function uploadProjectMusic(count: number) {
  await ensurePublicBucket(SUPABASE_BUCKETS.projectMusic);
  const tracks = buildGeneratedMusic(count);
  const uploaded = [];

  for (const track of tracks) {
    const result = await uploadBufferToSupabase({
      bucket: SUPABASE_BUCKETS.projectMusic,
      prefix: `generated/${track.category}`,
      fileName: `${track.id}.wav`,
      fallbackExt: '.wav',
      buffer: renderMusicWav(track),
      contentType: 'audio/wav',
      objectPath: track.storagePath,
      upsert: true,
    });

    const { baseFrequency, ...publicTrack } = track;
    uploaded.push({
      ...publicTrack,
      musicUrl: result.publicUrl,
      storagePath: result.path,
    });
  }

  return uploaded;
}

templatesRouter.post('/seed-transparent', requireAdmin, async (req, res, next) => {
  try {
    const { count = 360, offset = 0 } = seedSchema.parse(req.body || {});
    const templates = await uploadProjectTemplates(count, offset);
    res.json({ templates });
  } catch (e) { next(e); }
});

templatesRouter.post('/seed-assets', requireSeedSecret, async (req, res, next) => {
  try {
    const { count = 360, offset = 0, musicCount = 72 } = seedSchema.parse(req.body || {});
    await ensurePublicBucket(SUPABASE_BUCKETS.userTemplates);
    await ensurePublicBucket(SUPABASE_BUCKETS.userMusic);

    const templates = await uploadProjectTemplates(count, offset);
    const music = musicCount > 0 ? await uploadProjectMusic(musicCount) : [];

    res.json({
      ok: true,
      buckets: {
        projectTemplates: SUPABASE_BUCKETS.projectTemplates,
        projectMusic: SUPABASE_BUCKETS.projectMusic,
        userTemplates: SUPABASE_BUCKETS.userTemplates,
        userMusic: SUPABASE_BUCKETS.userMusic,
      },
      templateCount: templates.length,
      musicCount: music.length,
      offset,
      templates,
      music,
    });
  } catch (e) { next(e); }
});
