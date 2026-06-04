import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { Buffer } from 'node:buffer';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { requireAdmin, requireActiveSubscription, requirePlanFeature } from './auth';
import { GENERATED_TEMPLATE_CATALOG_SIZE, buildGeneratedTemplates, renderTemplatePng } from '../services/generatedTemplates';
import { GENERATED_ANIMATED_TEMPLATE_CATALOG_SIZE, buildGeneratedAnimatedTemplates, renderAnimatedTemplateWebm } from '../services/generatedAnimatedTemplates';
import { buildCuratedTemplates, getCuratedTemplate, renderCuratedTemplateSvg } from '../services/curatedTemplates';
import { buildMusicCatalog, catalogCutPath, catalogTrackToPublic, catalogWaveformPath, renderCatalogTrackWav } from '../services/musicCatalog';
import { computeWaveformFromBuffer, ffmpegAvailable, generateCutsFromBuffer, type CutDuration } from '../services/audioProcessing';
import { ensurePublicBucket, getSupabase, publicUrl, SUPABASE_BUCKETS, uploadBufferToSupabase } from '../services/supabaseStorage';
import { getFirebaseAdminFirestore } from '../services/firebaseAdmin';
import { createNotification } from '../services/notifications';
import { canUseTemplateFeature, hasPlanFeature } from '../services/planEntitlements';

export const templatesRouter = Router();

const seedSchema = z.object({
  count: z.number().int().min(1).max(2200).optional(),
  offset: z.number().int().min(0).max(10000).optional(),
  musicCount: z.number().int().min(0).max(120).optional(),
  animatedCount: z.number().int().min(0).max(600).optional(),
});

const templateCategories = [
  'party', 'wedding', 'corporate', 'birthday', 'viral', 'premium',
  'graduation', 'store', 'church',
  'infantil', 'esportivo', 'natal', 'carnaval', 'cha_revelacao', 'halloween',
  'brilhos_estrelas', 'confetes_festa', 'neon_glow', 'circulos_animados',
  'setas_chamadas', 'emojis_reacoes', 'elementos_festivos', 'cards_faixas',
  'tech_futurista', 'cubos_isometricos', 'flores_decorativos', 'minimal_premium',
  'gamer_neon', 'tropical', 'booth_360',
] as const;
const aspectRatios = ['9:16', '1:1', '16:9', 'auto'] as const;

const templateSchema = z.object({
  name: z.string().min(1),
  category: z.enum(templateCategories),
  colors: z.object({
    primary: z.string().min(1),
    secondary: z.string().min(1),
  }),
  font: z.string().min(1),
  designId: z.string().optional(),
  layout: z.string().optional(),
  variantKey: z.string().optional(),
  variantName: z.string().optional(),
  previewUrl: z.string().optional(),
  overlayUrl: z.string().optional(),
  animationUrl: z.string().optional(),
  animationStoragePath: z.string().optional(),
  tags: z.array(z.string()).optional(),
  type: z.enum(['static', 'animated']).optional(),
  format: z.enum(['png', 'webp', 'svg', 'lottie', 'webm', 'gif']).optional(),
  previewPath: z.string().optional(),
  thumbnailPath: z.string().optional(),
  isPremium: z.boolean().optional(),
  layerMode: z.enum(['frame', 'sticker', 'full-overlay', 'corner-decoration']).optional(),
  opacityDefault: z.number().min(0.2).max(1).optional(),
  templateType: z.enum(['static', 'animated']).optional(),
  assetFormat: z.enum(['png', 'webp', 'svg', 'lottie', 'webm', 'gif']).optional(),
  frameUrl: z.string().optional(),
  musicUrl: z.string().optional(),
  storagePath: z.string().optional(),
  aspectRatio: z.enum(aspectRatios),
  effects: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

const musicSchema = z.object({
  name: z.string().min(1),
  category: z.enum([...templateCategories, 'ambient'] as const),
  theme: z.string().optional(),
  bpm: z.number().optional(),
  duration: z.number().optional(),
  musicUrl: z.string().optional(),
  storagePath: z.string().optional(),
  source: z.literal('custom').optional(),
  library: z.string().optional(),
  licenseName: z.string().optional(),
  licenseUrl: z.string().optional(),
  attribution: z.string().optional(),
  isActive: z.boolean().default(true),
  // --- Metadados estendidos (sistema de música v2; opcionais) ---
  slug: z.string().optional(),
  subcategory: z.string().optional(),
  musicCategory: z.string().optional(),
  mood: z.array(z.string()).optional(),
  energyLevel: z.number().min(1).max(10).optional(),
  durationOriginal: z.number().optional(),
  availableCuts: z.array(z.number()).optional(),
  bestForDurations: z.array(z.number()).optional(),
  previewUrl: z.string().optional(),
  waveformUrl: z.string().optional(),
  cuts: z.record(z.string()).optional(),
  licenseType: z.string().optional(),
  allowedCommercialUse: z.boolean().optional(),
  attributionRequired: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  isPremium: z.boolean().optional(),
});

const templateUpdateSchema = templateSchema.partial();
const musicUpdateSchema = musicSchema.partial();

type SeedJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  count: number;
  offset: number;
  musicCount: number;
  animatedCount: number;
  templateUploaded: number;
  animatedUploaded: number;
  musicUploaded: number;
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  error?: string;
};

const seedJobs = new Map<string, SeedJob>();

type UserProfile = {
  uid: string;
  role: 'admin' | 'user';
  planId?: string | null;
};

function getDb() {
  const db = getFirebaseAdminFirestore();
  if (!db) {
    const err = new Error('FIREBASE_ADMIN_FIRESTORE_NOT_CONFIGURED');
    (err as any).status = 500;
    throw err;
  }
  return db;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefined(item)])
    ) as T;
  }

  return value;
}

function mediaFromDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  if (!doc.exists) return null;
  const { _ts, ...data } = doc.data() as Record<string, unknown>;
  return { id: doc.id, ...data } as Record<string, unknown> & { id: string };
}

function sortByNewest<T extends Record<string, unknown>>(items: T[]) {
  return items.sort((a, b) => Date.parse(String(b.createdAt || '')) - Date.parse(String(a.createdAt || '')));
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

async function loadOwnedDoc(collectionName: 'templates' | 'music', id: string, user: UserProfile) {
  const snap = await getDb().collection(collectionName).doc(id).get();
  const record = mediaFromDoc(snap);
  if (!record) {
    const err = new Error(`${collectionName.toUpperCase()}_NOT_FOUND`);
    (err as any).status = 404;
    throw err;
  }

  if (user.role !== 'admin' && record.ownerId !== user.uid) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  return record;
}

function generatedTemplateIdFromParam(rawId: string) {
  const id = rawId.replace(/\.(png|webm)$/i, '').replace(/^animated-/, '');
  const match = /^(?:generated|idea)-(\d+)$/.exec(id);
  if (!match) return null;

  const index = Number(match[1]);
  if (!Number.isInteger(index) || index < 1 || index > GENERATED_TEMPLATE_CATALOG_SIZE) return null;

  return { id, offset: index - 1 };
}

function publicRequestBase(req: Request) {
  const configured = process.env.PUBLIC_BACKEND_URL?.replace(/\/+$/, '');
  if (configured) return configured;

  const forwardedProtocol = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProtocol || req.protocol || 'https';
  return `${protocol}://${req.get('host')}`;
}

function generatedRenderUrl(req: Request, id: string) {
  return `${publicRequestBase(req)}/api/templates/render/${encodeURIComponent(id)}.png`;
}

function curatedRenderUrl(req: Request, id: string) {
  return `${publicRequestBase(req)}/api/templates/curated/render/${encodeURIComponent(id)}.svg`;
}

function heavyAssetJobsEnabled() {
  return process.env.SIX3_HEAVY_ASSET_JOBS_ENABLED === 'true';
}

function rejectHeavyAssetJob(res: Response) {
  return res.status(409).json({
    error: 'HEAVY_ASSET_JOB_DISABLED',
    message: 'Geração pesada de templates e músicas deve rodar fora do web service do Render.',
  });
}

templatesRouter.get('/render/:id', async (req, res, next) => {
  try {
    const target = generatedTemplateIdFromParam(req.params.id);
    if (!target) {
      res.status(404).json({ error: 'GENERATED_TEMPLATE_NOT_FOUND' });
      return;
    }

    const template = buildGeneratedTemplates(1, target.offset, { includeSvg: true, includeDataUrl: false })[0];
    if (!template || template.id !== target.id || !template.svg) {
      res.status(404).json({ error: 'GENERATED_TEMPLATE_NOT_FOUND' });
      return;
    }

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
    res.send(template.svg);
  } catch (e) { next(e); }
});

templatesRouter.get('/curated/render/:id', async (req, res, next) => {
  try {
    const template = getCuratedTemplate(req.params.id.replace(/\.svg$/i, ''), true);
    if (!template || !template.svg) {
      res.status(404).json({ error: 'CURATED_TEMPLATE_NOT_FOUND' });
      return;
    }

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
    res.send(template.svg);
  } catch (e) { next(e); }
});

templatesRouter.get('/render-motion/:id', (_req, res) => {
  res.status(410).json({
    error: 'SERVER_MOTION_RENDER_DISABLED',
    message: 'Templates animados devem ser pre-gerados em worker ou executados no navegador.',
  });
});

templatesRouter.get('/generated', requireActiveSubscription, (req, res) => {
  const user = res.locals.user as UserProfile;
  const isAdmin = user.role === 'admin';
  const canUseAnimatedTemplates = isAdmin || hasPlanFeature(user.planId, 'premium_templates');
  const curatedTemplates = buildCuratedTemplates({
    includeSvg: false,
    urlForPath: (path) => publicUrl(SUPABASE_BUCKETS.projectTemplates, path),
  })
    .filter((template) => canUseTemplateFeature(user.planId, template, isAdmin))
    .map((template) => ({
      ...template,
      previewUrl: curatedRenderUrl(req, template.id),
      overlayUrl: curatedRenderUrl(req, template.id),
      frameUrl: publicUrl(SUPABASE_BUCKETS.projectTemplates, template.storagePath),
      templateType: template.type,
      assetFormat: template.format,
    }));
  const templates = buildGeneratedTemplates(GENERATED_TEMPLATE_CATALOG_SIZE, 0, { includeSvg: false, includeDataUrl: false })
    .map(({ svg, ...template }) => ({
      ...template,
      previewUrl: generatedRenderUrl(req, template.id),
      overlayUrl: generatedRenderUrl(req, template.id),
    }))
    .filter((template) => canUseTemplateFeature(user.planId, template, isAdmin));
  const animatedTemplates = canUseAnimatedTemplates
    ? buildGeneratedAnimatedTemplates(GENERATED_ANIMATED_TEMPLATE_CATALOG_SIZE, 0, { includeSvg: false, includeDataUrl: false }).map(({ svg, ...template }) => ({
      ...template,
      previewUrl: generatedRenderUrl(req, template.id),
      overlayUrl: generatedRenderUrl(req, template.id),
      animationUrl: publicUrl(SUPABASE_BUCKETS.projectTemplates, template.animationStoragePath),
    }))
    : [];

  res.json({ templates: [...curatedTemplates, ...animatedTemplates, ...templates] });
});

templatesRouter.get('/generated-music', requireActiveSubscription, (_req, res) => {
  const music = buildMusicCatalog().map((track) => {
    const cuts: Record<string, string> = {};
    track.availableCuts.forEach((d) => {
      cuts[String(d)] = publicUrl(SUPABASE_BUCKETS.projectMusic, catalogCutPath(track, d));
    });
    return catalogTrackToPublic(track, publicUrl(SUPABASE_BUCKETS.projectMusic, track.storagePath), {
      cuts,
      waveformUrl: publicUrl(SUPABASE_BUCKETS.projectMusic, catalogWaveformPath(track)),
    });
  });
  res.json({ music });
});

templatesRouter.get('/custom', requireActiveSubscription, async (_req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const collection = getDb().collection('templates');
    const snap = user.role === 'admin'
      ? await collection.where('source', '==', 'custom').get()
      : await collection.where('ownerId', '==', user.uid).where('isActive', '==', true).get();
    const templates = sortByNewest(
      snap.docs
        .map(mediaFromDoc)
        .filter(isPresent)
        .filter((template) => canUseTemplateFeature(user.planId, template, user.role === 'admin'))
    );
    res.json({ templates });
  } catch (e) { next(e); }
});

templatesRouter.post('/custom', requirePlanFeature('custom_template_upload'), async (_req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const data = templateSchema.parse(_req.body || {});
    const now = new Date().toISOString();
    const template = stripUndefined({
      ...data,
      ownerId: user.uid,
      source: 'custom',
      isGlobal: false,
      createdAt: now,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    });
    const ref = await getDb().collection('templates').add(template);
    const { _ts, ...publicTemplate } = template;
    await createNotification({
      recipientUid: user.uid,
      category: 'template',
      title: 'Template enviado',
      body: `${data.name} foi salvo na sua biblioteca.`,
      link: '/app/templates',
      priority: 'normal',
      metadata: { templateId: ref.id },
    }).catch((error) => console.warn('[notifications] template skipped:', error instanceof Error ? error.message : error));
    res.status(201).json({ template: { id: ref.id, ...publicTemplate } });
  } catch (e) { next(e); }
});

templatesRouter.put('/custom/:id', requirePlanFeature('custom_template_upload'), async (req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    await loadOwnedDoc('templates', req.params.id, user);
    const data = stripUndefined(templateUpdateSchema.parse(req.body || {}));
    await getDb().collection('templates').doc(req.params.id).update({
      ...data,
      updatedAt: new Date().toISOString(),
      _ts: FieldValue.serverTimestamp(),
    });
    const snap = await getDb().collection('templates').doc(req.params.id).get();
    res.json({ template: mediaFromDoc(snap) });
  } catch (e) { next(e); }
});

templatesRouter.get('/custom-music', requireActiveSubscription, async (_req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const collection = getDb().collection('music');
    const snap = user.role === 'admin'
      ? await collection.where('source', '==', 'custom').get()
      : await collection.where('ownerId', '==', user.uid).where('isActive', '==', true).get();
    const music = sortByNewest(snap.docs.map(mediaFromDoc).filter(isPresent));
    res.json({ music });
  } catch (e) { next(e); }
});

templatesRouter.post('/custom-music', requirePlanFeature('custom_template_upload'), async (_req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const data = musicSchema.parse(_req.body || {});
    const now = new Date().toISOString();
    const music = stripUndefined({
      ...data,
      ownerId: user.uid,
      source: 'custom',
      isGlobal: false,
      createdAt: now,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    });
    const ref = await getDb().collection('music').add(music);
    const { _ts, ...publicMusic } = music;
    await createNotification({
      recipientUid: user.uid,
      category: 'template',
      title: 'Música enviada',
      body: `${data.name} foi salva nas suas trilhas.`,
      link: '/app/templates',
      priority: 'normal',
      metadata: { musicId: ref.id },
    }).catch((error) => console.warn('[notifications] music skipped:', error instanceof Error ? error.message : error));
    res.status(201).json({ music: { id: ref.id, ...publicMusic } });
  } catch (e) { next(e); }
});

templatesRouter.put('/custom-music/:id', requirePlanFeature('custom_template_upload'), async (req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    await loadOwnedDoc('music', req.params.id, user);
    const data = stripUndefined(musicUpdateSchema.parse(req.body || {}));
    await getDb().collection('music').doc(req.params.id).update({
      ...data,
      updatedAt: new Date().toISOString(),
      _ts: FieldValue.serverTimestamp(),
    });
    const snap = await getDb().collection('music').doc(req.params.id).get();
    res.json({ music: mediaFromDoc(snap) });
  } catch (e) { next(e); }
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

async function uploadCuratedTemplates(adminUid?: string) {
  await ensurePublicBucket(SUPABASE_BUCKETS.projectTemplates);
  const db = getFirebaseAdminFirestore();
  const templates = buildCuratedTemplates({ includeSvg: true });

  return mapConcurrent(templates, seedConcurrency(), async (template) => {
    const svg = template.svg || renderCuratedTemplateSvg(template);
    const buffer = Buffer.from(svg, 'utf8');
    const [asset, preview] = await Promise.all([
      uploadBufferToSupabase({
        bucket: SUPABASE_BUCKETS.projectTemplates,
        prefix: template.type === 'animated' ? 'templates/animated' : 'templates/static',
        fileName: `${template.id}.svg`,
        fallbackExt: '.svg',
        buffer,
        contentType: 'image/svg+xml; charset=utf-8',
        objectPath: template.storagePath,
        upsert: true,
      }),
      uploadBufferToSupabase({
        bucket: SUPABASE_BUCKETS.projectTemplates,
        prefix: template.type === 'animated' ? 'templates/previews/animated' : 'templates/previews/static',
        fileName: `${template.id}.svg`,
        fallbackExt: '.svg',
        buffer,
        contentType: 'image/svg+xml; charset=utf-8',
        objectPath: template.previewPath,
        upsert: true,
      }),
    ]);

    const { svg: _svg, ...publicTemplate } = template;
    const savedTemplate = stripUndefined({
      ...publicTemplate,
      overlayUrl: asset.publicUrl,
      previewUrl: preview.publicUrl,
      frameUrl: asset.publicUrl,
      storagePath: asset.path,
      previewPath: preview.path,
      templateType: publicTemplate.type,
      assetFormat: publicTemplate.format,
      createdBy: adminUid || 'system',
      updatedAt: new Date().toISOString(),
      _ts: FieldValue.serverTimestamp(),
    });

    if (db) {
      await db.collection('templates').doc(publicTemplate.id).set(savedTemplate, { merge: true }).catch((error) => {
        console.warn('[templates] curated metadata skipped:', error instanceof Error ? error.message : error);
      });
    }

    const { _ts, ...responseTemplate } = savedTemplate as Record<string, unknown>;
    return responseTemplate;
  });
}

async function listStoragePathsRecursive(prefix: string): Promise<string[]> {
  const bucket = getSupabase().storage.from(SUPABASE_BUCKETS.projectTemplates);
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await bucket.list(prefix, { limit: 1000, offset });
    if (error) {
      const err = new Error(`SUPABASE_LIST_FAILED: ${error.message}`);
      (err as any).status = 502;
      throw err;
    }

    const entries = data || [];
    for (const entry of entries) {
      const entryPath = `${prefix}/${entry.name}`;
      if (entry.metadata) {
        paths.push(entryPath);
      } else {
        paths.push(...await listStoragePathsRecursive(entryPath));
      }
    }

    if (entries.length < 1000) break;
    offset += entries.length;
  }

  return paths;
}

async function removeStoragePaths(paths: string[]) {
  const bucket = getSupabase().storage.from(SUPABASE_BUCKETS.projectTemplates);
  let deleted = 0;

  for (let index = 0; index < paths.length; index += 100) {
    const chunk = paths.slice(index, index + 100);
    if (chunk.length === 0) continue;
    const { error } = await bucket.remove(chunk);
    if (error) {
      console.warn('[templates] curated storage cleanup skipped:', error.message);
      continue;
    }
    deleted += chunk.length;
  }

  return deleted;
}

async function cleanupCuratedTemplates() {
  await ensurePublicBucket(SUPABASE_BUCKETS.projectTemplates);
  const prefixes = ['templates/static', 'templates/animated', 'templates/previews/static', 'templates/previews/animated'];
  const paths = (await Promise.all(prefixes.map((prefix) => listStoragePathsRecursive(prefix)))).flat();
  const storageDeleted = await removeStoragePaths(paths);
  let metadataDeleted = 0;

  const db = getFirebaseAdminFirestore();
  if (db) {
    const snap = await db.collection('templates').get();
    const docs = snap.docs.filter((doc) => doc.id.startsWith('curated-'));

    for (let index = 0; index < docs.length; index += 450) {
      const batch = db.batch();
      docs.slice(index, index + 450).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      metadataDeleted += Math.min(450, docs.length - index);
    }
  }

  return { storageDeleted, metadataDeleted };
}

// Fades recomendados por duração do corte.
function cutFades(duration: number): { fadeIn: number; fadeOut: number } {
  switch (duration) {
    case 5: return { fadeIn: 0, fadeOut: 0.4 };
    case 15: return { fadeIn: 0.2, fadeOut: 0.6 };
    case 25: return { fadeIn: 0.4, fadeOut: 0.8 };
    case 35: return { fadeIn: 0.6, fadeOut: 1.0 };
    default: return { fadeIn: 0.8, fadeOut: 1.2 };
  }
}

// Gera e envia o catálogo novo por categoria ao Supabase (original + cortes 5/15/25/35/45s
// + waveform). O parâmetro `count` é mantido por compatibilidade; o catálogo define as faixas.
async function uploadProjectMusic(_count: number) {
  await ensurePublicBucket(SUPABASE_BUCKETS.projectMusic);
  const tracks = buildMusicCatalog();
  const canCut = ffmpegAvailable();
  const uploaded = [];

  for (const track of tracks) {
    const originalBuffer = renderCatalogTrackWav(track);
    const result = await uploadBufferToSupabase({
      bucket: SUPABASE_BUCKETS.projectMusic,
      prefix: `originals/${track.musicCategory}`,
      fileName: `${track.slug}.wav`,
      fallbackExt: '.wav',
      buffer: originalBuffer,
      contentType: 'audio/wav',
      objectPath: track.storagePath,
      upsert: true,
    });

    const cuts: Record<string, string> = {};
    let waveformUrl: string | undefined;

    if (canCut) {
      try {
        const specs = track.availableCuts.map((duration) => ({
          duration: duration as CutDuration,
          sourceStart: 0,
          ...cutFades(duration),
        }));
        const cutBuffers = await generateCutsFromBuffer(originalBuffer, specs);
        for (const [duration, buffer] of cutBuffers) {
          const cutPath = catalogCutPath(track, duration);
          await uploadBufferToSupabase({
            bucket: SUPABASE_BUCKETS.projectMusic,
            prefix: `cuts/${track.musicCategory}/${track.slug}`,
            fileName: `${duration}s.mp3`,
            fallbackExt: '.mp3',
            buffer,
            contentType: 'audio/mpeg',
            objectPath: cutPath,
            upsert: true,
          });
          cuts[String(duration)] = publicUrl(SUPABASE_BUCKETS.projectMusic, cutPath);
        }

        const peaks = await computeWaveformFromBuffer(originalBuffer);
        const wavePath = catalogWaveformPath(track);
        await uploadBufferToSupabase({
          bucket: SUPABASE_BUCKETS.projectMusic,
          prefix: `waveforms/${track.musicCategory}`,
          fileName: `${track.slug}.json`,
          fallbackExt: '.json',
          buffer: Buffer.from(JSON.stringify({ peaks })),
          contentType: 'application/json',
          objectPath: wavePath,
          upsert: true,
        });
        waveformUrl = publicUrl(SUPABASE_BUCKETS.projectMusic, wavePath);
      } catch (error) {
        // Sem ffmpeg ou falha pontual: segue só com o original (o player corta em tempo real).
        console.warn('[music] cut/waveform skipped:', track.id, error instanceof Error ? error.message : error);
      }
    }

    uploaded.push(catalogTrackToPublic(track, result.publicUrl, { cuts, waveformUrl }));
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

  if (!heavyAssetJobsEnabled()) {
    updateSeedJob(jobId, {
      status: 'failed',
      error: 'HEAVY_ASSET_JOB_DISABLED',
      finishedAt: new Date().toISOString(),
    });
    return;
  }

  updateSeedJob(jobId, { status: 'running' });

  try {
    await ensurePublicBucket(SUPABASE_BUCKETS.userTemplates);
    await ensurePublicBucket(SUPABASE_BUCKETS.userMusic);

    await uploadProjectTemplates(job.count, job.offset, () => {
      const current = seedJobs.get(jobId);
      updateSeedJob(jobId, { templateUploaded: (current?.templateUploaded || 0) + 1 });
    });

    if (job.animatedCount > 0) {
      await uploadProjectAnimatedTemplates(job.animatedCount, job.offset, () => {
        const current = seedJobs.get(jobId);
        updateSeedJob(jobId, { animatedUploaded: (current?.animatedUploaded || 0) + 1 });
      });
    }

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
    if (!heavyAssetJobsEnabled()) return rejectHeavyAssetJob(res);

    const { count = GENERATED_TEMPLATE_CATALOG_SIZE, offset = 0, animatedCount = GENERATED_ANIMATED_TEMPLATE_CATALOG_SIZE, musicCount = 0 } = seedSchema.parse(req.body || {});
    const templates = await uploadProjectTemplates(count, offset);
    const animatedTemplates = animatedCount > 0 ? await uploadProjectAnimatedTemplates(animatedCount, offset) : [];
    const music = musicCount > 0 ? await uploadProjectMusic(musicCount) : [];
    res.json({ templates: [...animatedTemplates, ...templates], music });
  } catch (e) { next(e); }
});

templatesRouter.post('/seed-curated', requireAdmin, async (_req, res, next) => {
  try {
    const adminUid = typeof res.locals.user?.uid === 'string' ? res.locals.user.uid : undefined;
    const cleanup = await cleanupCuratedTemplates();
    const templates = await uploadCuratedTemplates(adminUid);
    res.json({
      ok: true,
      bucket: SUPABASE_BUCKETS.projectTemplates,
      cleanup,
      templateCount: templates.length,
      templates,
    });
  } catch (e) { next(e); }
});

templatesRouter.post('/seed-animated', requireSeedSecret, async (req, res, next) => {
  try {
    if (!heavyAssetJobsEnabled()) return rejectHeavyAssetJob(res);

    const { count = 144, offset = 0 } = seedSchema.parse(req.body || {});
    const templates = await uploadProjectAnimatedTemplates(count, offset);
    res.json({ ok: true, templateCount: templates.length, templates });
  } catch (e) { next(e); }
});

templatesRouter.post('/seed-assets', requireSeedSecret, async (req, res, next) => {
  try {
    if (!heavyAssetJobsEnabled()) return rejectHeavyAssetJob(res);

    const { count = GENERATED_TEMPLATE_CATALOG_SIZE, offset = 0, musicCount = 72, animatedCount = GENERATED_ANIMATED_TEMPLATE_CATALOG_SIZE } = seedSchema.parse(req.body || {});
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
    if (!heavyAssetJobsEnabled()) return rejectHeavyAssetJob(res);

    const { count = GENERATED_TEMPLATE_CATALOG_SIZE, offset = 0, musicCount = 0, animatedCount = GENERATED_ANIMATED_TEMPLATE_CATALOG_SIZE } = seedSchema.parse(req.body || {});
    const now = new Date().toISOString();
    const job: SeedJob = {
      id: randomUUID(),
      status: 'queued',
      count,
      offset,
      musicCount,
      animatedCount,
      templateUploaded: 0,
      animatedUploaded: 0,
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

templatesRouter.post('/seed-transparent-job', requireAdmin, async (req, res, next) => {
  try {
    if (!heavyAssetJobsEnabled()) return rejectHeavyAssetJob(res);

    const { count = GENERATED_TEMPLATE_CATALOG_SIZE, offset = 0, musicCount = 72, animatedCount = GENERATED_ANIMATED_TEMPLATE_CATALOG_SIZE } = seedSchema.parse(req.body || {});
    const now = new Date().toISOString();
    const job: SeedJob = {
      id: randomUUID(),
      status: 'queued',
      count,
      offset,
      musicCount,
      animatedCount,
      templateUploaded: 0,
      animatedUploaded: 0,
      musicUploaded: 0,
      startedAt: now,
      updatedAt: now,
    };

    seedJobs.set(job.id, job);
    void runSeedJob(job.id);

    res.status(202).json({ job: publicSeedJob(job) });
  } catch (e) { next(e); }
});

templatesRouter.get('/seed-transparent-job/:id', requireAdmin, (req, res) => {
  const job = seedJobs.get(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'SEED_JOB_NOT_FOUND' });
    return;
  }

  res.json({ job: publicSeedJob(job) });
});
