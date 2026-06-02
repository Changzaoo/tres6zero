import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { Buffer } from 'node:buffer';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { requireAdmin, requireActiveSubscription } from './auth';
import { buildGeneratedTemplates, renderTemplatePng } from '../services/generatedTemplates';
import { buildGeneratedAnimatedTemplates, renderAnimatedTemplateWebm } from '../services/generatedAnimatedTemplates';
import { buildGeneratedMusic, renderMusicWav } from '../services/generatedMusic';
import { ensurePublicBucket, publicUrl, SUPABASE_BUCKETS, uploadBufferToSupabase } from '../services/supabaseStorage';

export const templatesRouter = Router();

const seedSchema = z.object({
  count: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).max(10000).optional(),
  musicCount: z.number().int().min(0).max(120).optional(),
  animatedCount: z.number().int().min(0).max(300).optional(),
});

type SeedJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  count: number;
  offset: number;
  musicCount: number;
  templateUploaded: number;
  musicUploaded: number;
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  error?: string;
};

const seedJobs = new Map<string, SeedJob>();

templatesRouter.get('/generated', requireActiveSubscription, (_req, res) => {
  const templates = buildGeneratedTemplates(720, 0, { includeSvg: false, includeDataUrl: false }).map(({ svg, ...template }) => ({
    ...template,
    overlayUrl: publicUrl(SUPABASE_BUCKETS.projectTemplates, template.storagePath),
  }));
  const animatedTemplates = buildGeneratedAnimatedTemplates(144, 0, { includeSvg: false, includeDataUrl: false }).map(({ svg, ...template }) => ({
    ...template,
    overlayUrl: publicUrl(SUPABASE_BUCKETS.projectTemplates, template.storagePath),
    animationUrl: publicUrl(SUPABASE_BUCKETS.projectTemplates, template.animationStoragePath),
  }));

  res.json({ templates: [...animatedTemplates, ...templates] });
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

function seedConcurrency() {
  const configured = Number(process.env.TEMPLATE_SEED_CONCURRENCY || 4);
  if (!Number.isFinite(configured)) return 4;
  return Math.min(8, Math.max(1, Math.round(configured)));
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, handler: (item: T, index: number) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await handler(items[index], index);
    }
  }));

  return results;
}

async function uploadProjectTemplates(count: number, offset = 0, onUploaded?: () => void) {
  await ensurePublicBucket(SUPABASE_BUCKETS.projectTemplates);
  const templates = buildGeneratedTemplates(count, offset, { includeSvg: true, includeDataUrl: false });

  return mapConcurrent(templates, seedConcurrency(), async (template) => {
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
    onUploaded?.();
    return {
      ...publicTemplate,
      overlayUrl: result.publicUrl,
      storagePath: result.path,
    };
  });
}

async function uploadProjectAnimatedTemplates(count: number, offset = 0, onUploaded?: () => void) {
  await ensurePublicBucket(SUPABASE_BUCKETS.projectTemplates);
  const templates = buildGeneratedAnimatedTemplates(count, offset, { includeSvg: true, includeDataUrl: false });

  return mapConcurrent(templates, Math.min(2, seedConcurrency()), async (template) => {
    const result = await uploadBufferToSupabase({
      bucket: SUPABASE_BUCKETS.projectTemplates,
      prefix: `animated/${template.category}`,
      fileName: `${template.id}.webm`,
      fallbackExt: '.webm',
      buffer: await renderAnimatedTemplateWebm(template),
      contentType: 'video/webm',
      objectPath: template.animationStoragePath,
      upsert: true,
    });

    const { svg, ...publicTemplate } = template;
    onUploaded?.();
    return {
      ...publicTemplate,
      overlayUrl: publicUrl(SUPABASE_BUCKETS.projectTemplates, template.storagePath),
      animationUrl: result.publicUrl,
      animationStoragePath: result.path,
    };
  });
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

function publicSeedJob(job: SeedJob) {
  return { ...job };
}

function updateSeedJob(id: string, data: Partial<SeedJob>) {
  const current = seedJobs.get(id);
  if (!current) return;
  seedJobs.set(id, { ...current, ...data, updatedAt: new Date().toISOString() });
}

async function runSeedJob(jobId: string) {
  const job = seedJobs.get(jobId);
  if (!job) return;

  updateSeedJob(jobId, { status: 'running' });

  try {
    await ensurePublicBucket(SUPABASE_BUCKETS.userTemplates);
    await ensurePublicBucket(SUPABASE_BUCKETS.userMusic);

    await uploadProjectTemplates(job.count, job.offset, () => {
      const current = seedJobs.get(jobId);
      updateSeedJob(jobId, { templateUploaded: (current?.templateUploaded || 0) + 1 });
    });

    if (job.musicCount > 0) {
      const tracks = await uploadProjectMusic(job.musicCount);
      updateSeedJob(jobId, { musicUploaded: tracks.length });
    }

    updateSeedJob(jobId, {
      status: 'completed',
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    updateSeedJob(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'SEED_JOB_FAILED',
      finishedAt: new Date().toISOString(),
    });
  }
}

templatesRouter.post('/seed-transparent', requireAdmin, async (req, res, next) => {
  try {
    const { count = 360, offset = 0 } = seedSchema.parse(req.body || {});
    const templates = await uploadProjectTemplates(count, offset);
    res.json({ templates });
  } catch (e) { next(e); }
});

templatesRouter.post('/seed-animated', requireSeedSecret, async (req, res, next) => {
  try {
    const { count = 144, offset = 0 } = seedSchema.parse(req.body || {});
    const templates = await uploadProjectAnimatedTemplates(count, offset);
    res.json({ ok: true, templateCount: templates.length, templates });
  } catch (e) { next(e); }
});

templatesRouter.post('/seed-assets', requireSeedSecret, async (req, res, next) => {
  try {
    const { count = 360, offset = 0, musicCount = 72, animatedCount = 0 } = seedSchema.parse(req.body || {});
    await ensurePublicBucket(SUPABASE_BUCKETS.userTemplates);
    await ensurePublicBucket(SUPABASE_BUCKETS.userMusic);

    const templates = await uploadProjectTemplates(count, offset);
    const animatedTemplates = animatedCount > 0 ? await uploadProjectAnimatedTemplates(animatedCount, offset) : [];
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
      animatedTemplateCount: animatedTemplates.length,
      musicCount: music.length,
      offset,
      templates: [...animatedTemplates, ...templates],
      music,
    });
  } catch (e) { next(e); }
});

templatesRouter.post('/seed-assets-job', requireSeedSecret, async (req, res, next) => {
  try {
    const { count = 720, offset = 0, musicCount = 0 } = seedSchema.parse(req.body || {});
    const now = new Date().toISOString();
    const job: SeedJob = {
      id: randomUUID(),
      status: 'queued',
      count,
      offset,
      musicCount,
      templateUploaded: 0,
      musicUploaded: 0,
      startedAt: now,
      updatedAt: now,
    };

    seedJobs.set(job.id, job);
    void runSeedJob(job.id);

    res.status(202).json({ job: publicSeedJob(job) });
  } catch (e) { next(e); }
});

templatesRouter.get('/seed-assets-job/:id', requireSeedSecret, (req, res) => {
  const job = seedJobs.get(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'SEED_JOB_NOT_FOUND' });
    return;
  }

  res.json({ job: publicSeedJob(job) });
});
