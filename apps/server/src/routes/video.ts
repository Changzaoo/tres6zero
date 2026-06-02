import { Router } from 'express';
import { z } from 'zod';
import { processVideo, getAvailableEffects } from '../services/videoProcessor';
import { featureForEffect, hasPlanFeature } from '../services/planEntitlements';
import { getSupabaseUrl } from '../services/supabaseStorage';
import { requireActiveSubscription } from './auth';

export const videoRouter = Router();

const allowedDurations: readonly number[] = [5, 15, 25, 35, 45];

const processSchema = z.object({
  videoId: z.string(),
  inputUrl: z.string().min(1),
  storagePath: z.string().optional(),
  templateId: z.string().optional(),
  overlayUrl: z.string().min(1).optional(),
  effect: z.string().optional(),
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

videoRouter.post('/process', requireActiveSubscription, async (req, res, next) => {
  try {
    const config = processSchema.parse(req.body);
    const profile = res.locals.user;
    const feature = featureForEffect(config.effect);

    if (!isAllowedSupabaseUrl(config.inputUrl)) {
      rejectInvalidMediaUrl('INVALID_INPUT_URL');
    }

    if (config.overlayUrl && !isAllowedSupabaseUrl(config.overlayUrl) && !isAllowedOverlayDataUrl(config.overlayUrl)) {
      rejectInvalidMediaUrl('INVALID_OVERLAY_URL');
    }

    if (config.musicUrl && !isAllowedSupabaseUrl(config.musicUrl)) {
      rejectInvalidMediaUrl('INVALID_MUSIC_URL');
    }

    if (profile?.role !== 'admin' && !hasPlanFeature(profile?.planId, feature)) {
      return res.status(403).json({
        error: 'PLAN_FEATURE_REQUIRED',
        code: feature,
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
