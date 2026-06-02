import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { AI_EFFECTS, BASIC_EFFECTS, POPULAR_EFFECTS } from './planEntitlements';

export const VIDEO_EXPORT_FORMATS = ['9:16', '1:1', '16:9'] as const;

const parameterValueSchema = z.union([
  z.number().finite().min(-1000).max(1000),
  z.boolean(),
  z.string().max(120),
  z.array(z.string().max(60)).max(12),
]);

const effectParametersSchema = z.record(parameterValueSchema).default({});

const knownEffects = new Set([...BASIC_EFFECTS, ...POPULAR_EFFECTS, ...AI_EFFECTS]);

export function isKnownVideoEffect(effectId: string) {
  return knownEffects.has(effectId);
}

export function sanitizeEffectParameters(value: unknown) {
  const parameters = effectParametersSchema.parse(value || {});
  Object.keys(parameters).forEach((key) => {
    if (!/^[a-zA-Z0-9_]+$/.test(key) || key.length > 40) {
      const err = new Error('INVALID_EFFECT_PARAMETER');
      (err as any).status = 400;
      throw err;
    }
  });

  return parameters;
}

type EnqueueEffectJobInput = {
  db: FirebaseFirestore.Firestore;
  videoId: string;
  userId: string;
  effectId: string;
  effectName?: string;
  parameters: Record<string, unknown>;
  exportFormat: typeof VIDEO_EXPORT_FORMATS[number];
  finalDuration?: number;
};

export async function enqueueMockEffectJob(input: EnqueueEffectJobInput) {
  const jobId = `effect_${crypto.randomBytes(12).toString('hex')}`;
  const now = new Date().toISOString();

  await input.db.collection('videoEffectJobs').doc(jobId).set({
    videoId: input.videoId,
    ownerId: input.userId,
    effectId: input.effectId,
    effectName: input.effectName || input.effectId,
    parameters: input.parameters,
    exportFormat: input.exportFormat,
    finalDuration: input.finalDuration || null,
    status: 'queued',
    mode: 'mock',
    createdAt: now,
    updatedAt: now,
    _ts: FieldValue.serverTimestamp(),
  });

  // Future FFmpeg worker integration:
  // - color filters map to brightness, contrast, saturation, temperature and vignette.
  // - speed filters use setpts/atempo for slow_motion and speed_ramp.
  // - boomerang renders a forward clip, reverses it, then concatenates both parts.
  // - transparent templates use overlay with alpha support over the scaled video.
  // - glow and glitch can be generated with split, blend, rgb shift and timed flashes.
  // - fade in/out should be applied after speed changes and before final export.
  // - export format should choose scale/pad/crop for 9:16, 1:1 or 16:9.

  return jobId;
}
