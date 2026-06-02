import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { processVideo, getAvailableEffects } from '../services/videoProcessor';
import { featureForEffect, hasPlanFeature } from '../services/planEntitlements';
import { getSupabaseUrl } from '../services/supabaseStorage';
import { requireActiveSubscription } from './auth';
import { getFirebaseAdminFirestore } from '../services/firebaseAdmin';

export const videoRouter = Router();

const allowedDurations: readonly number[] = [5, 15, 25, 35, 45];
const videoStatuses = ['uploaded', 'processing', 'processed', 'failed', 'published'] as const;

const videoSchema = z.object({
  eventId: z.string().min(1),
  operatorId: z.string().min(1),
  title: z.string().min(1),
  storagePath: z.string().min(1),
  videoUrl: z.string().min(1),
  rawVideoUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  status: z.enum(videoStatuses),
  duration: z.number().optional(),
  size: z.number().optional(),
  format: z.string().optional(),
  templateId: z.string().optional(),
  effect: z.string().optional(),
  musicTheme: z.string().optional(),
  musicUrl: z.string().optional(),
  views: z.number().int().min(0).default(0),
  downloads: z.number().int().min(0).default(0),
  shares: z.number().int().min(0).default(0),
});

const videoUpdateSchema = videoSchema.omit({ eventId: true, operatorId: true }).partial();
const statSchema = z.object({ field: z.enum(['views', 'downloads', 'shares']) });

const processSchema = z.object({
  videoId: z.string(),
  inputUrl: z.string().min(1),
  storagePath: z.string().optional(),
  templateId: z.string().optional(),
  overlayUrl: z.string().min(1).optional(),
  animationUrl: z.string().min(1).optional(),
  effect: z.string().optional(),
  effectSegments: z.array(z.object({
    effect: z.string().min(1),
    start: z.number().min(0).max(45),
    end: z.number().min(0).max(45),
  }).refine((segment) => segment.end > segment.start, {
    message: 'INVALID_EFFECT_SEGMENT_RANGE',
  })).max(8).optional(),
  musicTheme: z.string().optional(),
  musicUrl: z.string().min(1).optional(),
  eventType: z.string().optional(),
  durationSeconds: z.number().int().refine((value) => allowedDurations.includes(value), {
    message: 'INVALID_DURATION_SECONDS',
  }).optional(),
});

function allowedSupabaseHost() {
  return new URL(getSupabaseUrl()).host;
}

function isAllowedSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.host === allowedSupabaseHost();
  } catch {
    return false;
  }
}

function isAllowedOverlayDataUrl(value: string) {
  if (value.length > 2_000_000) return false;
  return /^data:image\/(png|webp|svg\+xml);base64,/i.test(value);
}

function rejectInvalidMediaUrl(code: string): never {
  const err = new Error(code);
  (err as any).status = 400;
  throw err;
}

type UserProfile = {
  uid: string;
  role: 'admin' | 'user';
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

function videoFromDoc(doc: FirebaseFirestore.DocumentSnapshot) {
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

function canManageVideo(user: UserProfile, video: Record<string, unknown>) {
  return user.role === 'admin' || video.ownerId === user.uid;
}

async function loadManageableVideo(id: string, user: UserProfile) {
  const snap = await getDb().collection('videos').doc(id).get();
  const video = videoFromDoc(snap);
  if (!video) {
    const err = new Error('VIDEO_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  if (!canManageVideo(user, video)) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  return video;
}

videoRouter.get('/', requireActiveSubscription, async (_req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const collection = getDb().collection('videos');
    const snap = user.role === 'admin'
      ? await collection.get()
      : await collection.where('ownerId', '==', user.uid).get();
    const videos = sortByNewest(snap.docs.map(videoFromDoc).filter(isPresent));
    res.json({ videos });
  } catch (e) { next(e); }
});

videoRouter.post('/', requireActiveSubscription, async (req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const data = videoSchema.parse(req.body || {});
    const now = new Date().toISOString();
    const video = stripUndefined({
      ...data,
      ownerId: user.uid,
      operatorId: user.uid,
      createdAt: now,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    });
    const ref = await getDb().collection('videos').add(video);
    const { _ts, ...publicVideo } = video;
    res.status(201).json({ video: { id: ref.id, ...publicVideo } });
  } catch (e) { next(e); }
});

videoRouter.post('/process', requireActiveSubscription, async (req, res, next) => {
  try {
    const config = processSchema.parse(req.body);
    const profile = res.locals.user;
    const requiredEffectFeatures = [
      featureForEffect(config.effect),
      ...(config.effectSegments || []).map((segment) => featureForEffect(segment.effect)),
    ];

    if (!isAllowedSupabaseUrl(config.inputUrl)) {
      rejectInvalidMediaUrl('INVALID_INPUT_URL');
    }

    if (config.overlayUrl && !isAllowedSupabaseUrl(config.overlayUrl) && !isAllowedOverlayDataUrl(config.overlayUrl)) {
      rejectInvalidMediaUrl('INVALID_OVERLAY_URL');
    }

    if (config.animationUrl && !isAllowedSupabaseUrl(config.animationUrl)) {
      rejectInvalidMediaUrl('INVALID_ANIMATION_URL');
    }

    if (config.musicUrl && !isAllowedSupabaseUrl(config.musicUrl)) {
      rejectInvalidMediaUrl('INVALID_MUSIC_URL');
    }

    const blockedFeature = profile?.role === 'admin'
      ? null
      : requiredEffectFeatures.find((feature) => !hasPlanFeature(profile?.planId, feature));

    if (blockedFeature) {
      return res.status(403).json({
        error: 'PLAN_FEATURE_REQUIRED',
        code: blockedFeature,
      });
    }

    const result = await processVideo({
      ...config,
      userId: profile?.uid,
    });
    res.status(result.status === 'failed' ? 500 : 200).json(result);
  } catch (e) { next(e); }
});

videoRouter.get('/effects', (_req, res) => {
  res.json({ effects: getAvailableEffects() });
});

videoRouter.get('/event/:eventId', async (req, res, next) => {
  try {
    const snap = await getDb()
      .collection('videos')
      .where('eventId', '==', req.params.eventId)
      .where('status', '==', 'published')
      .get();
    const videos = sortByNewest(snap.docs.map(videoFromDoc).filter(isPresent));
    res.json({ videos });
  } catch (e) { next(e); }
});

videoRouter.get('/:id', async (req, res, next) => {
  try {
    const snap = await getDb().collection('videos').doc(req.params.id).get();
    const video = videoFromDoc(snap);
    if (!video || (video as { status?: string }).status !== 'published') {
      res.status(404).json({ video: null });
      return;
    }

    res.json({ video });
  } catch (e) { next(e); }
});

videoRouter.put('/:id', requireActiveSubscription, async (req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    await loadManageableVideo(req.params.id, user);
    const data = stripUndefined(videoUpdateSchema.parse(req.body || {}));
    await getDb().collection('videos').doc(req.params.id).update({
      ...data,
      updatedAt: new Date().toISOString(),
      _ts: FieldValue.serverTimestamp(),
    });
    const snap = await getDb().collection('videos').doc(req.params.id).get();
    res.json({ video: videoFromDoc(snap) });
  } catch (e) { next(e); }
});

videoRouter.post('/:id/stats', async (req, res, next) => {
  try {
    const { field } = statSchema.parse(req.body || {});
    const ref = getDb().collection('videos').doc(req.params.id);
    await ref.update({
      [field]: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
      _ts: FieldValue.serverTimestamp(),
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
