import { boomerangEffect } from './effectPresets/boomerang';
import { cinematicEffect } from './effectPresets/cinematic';
import { cleanEffect } from './effectPresets/clean';
import { corporateSharpEffect } from './effectPresets/corporateSharp';
import { glitchFlashEffect } from './effectPresets/glitchFlash';
import { iaAutoEditEffect } from './effectPresets/iaAutoEdit';
import { luxuryGoldEffect } from './effectPresets/luxuryGold';
import { neonGlowEffect } from './effectPresets/neonGlow';
import { partyPopEffect } from './effectPresets/partyPop';
import { slowMotionEffect } from './effectPresets/slowMotion';
import { speedRampEffect } from './effectPresets/speedRamp';
import { weddingSoftEffect } from './effectPresets/weddingSoft';
import type { VideoEffectConfig, VideoEffectId } from './effects.types';

export const videoEffects = [
  cleanEffect,
  slowMotionEffect,
  boomerangEffect,
  speedRampEffect,
  cinematicEffect,
  neonGlowEffect,
  partyPopEffect,
  luxuryGoldEffect,
  glitchFlashEffect,
  weddingSoftEffect,
  corporateSharpEffect,
  iaAutoEditEffect,
] as const satisfies readonly VideoEffectConfig[];

export const videoEffectIds = videoEffects.map((effect) => effect.id);

export function getVideoEffect(effectId?: string | null) {
  return videoEffects.find((effect) => effect.id === effectId) || null;
}

export function isVideoEffectId(effectId: string): effectId is VideoEffectId {
  return videoEffects.some((effect) => effect.id === effectId);
}
