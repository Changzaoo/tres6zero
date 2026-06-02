import { apiRequest } from '@/services/authService';
import { getVideoEffect, isVideoEffectId } from './effects.config';
import type { ApplyEffectPayload, VideoEffectId, VideoEffectParameters, VideoExportFormat } from './effects.types';

export type ApplyEffectInput = {
  videoId: string;
  effectId: string;
  exportFormat: VideoExportFormat;
  finalDuration?: number;
  parameters?: VideoEffectParameters;
};

export type ApplyEffectResponse = {
  success: true;
  jobId: string;
  message: string;
};

export function buildEffectPayload(input: ApplyEffectInput): ApplyEffectPayload {
  if (!isVideoEffectId(input.effectId)) {
    throw new Error('Efeito invalido.');
  }

  const effect = getVideoEffect(input.effectId);
  if (!effect) {
    throw new Error('Efeito invalido.');
  }

  return {
    videoId: input.videoId,
    effectId: input.effectId as VideoEffectId,
    effectName: effect.name,
    parameters: input.parameters || effect.parameters,
    exportFormat: input.exportFormat,
    finalDuration: input.finalDuration,
  };
}

export async function applyEffect(input: ApplyEffectInput) {
  const payload = buildEffectPayload(input);
  return apiRequest<ApplyEffectResponse>('/api/videos/apply-effect', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
