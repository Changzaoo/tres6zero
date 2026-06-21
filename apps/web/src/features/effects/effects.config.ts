import { auraEnergyEffect } from './effectPresets/auraEnergy';
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
// Motor de efeitos criativos
import { rimNeonEffect } from './effectPresets/rimNeon';
import { speedClonesEffect } from './effectPresets/speedClones';
import { ghostEchoEffect } from './effectPresets/ghostEcho';
import { lightTrailsEffect } from './effectPresets/lightTrails';
import { freezeBackgroundEffect } from './effectPresets/freezeBackground';
import { backgroundFocusEffect } from './effectPresets/backgroundFocus';
import { backgroundReplaceEffect } from './effectPresets/backgroundReplace';
import { particleDissolveEffect } from './effectPresets/particleDissolve';
import { portalEffect } from './effectPresets/portal';
import { ambientParticlesEffect } from './effectPresets/ambientParticles';
import { lightLeaksEffect } from './effectPresets/lightLeaks';
import { godRaysEffect } from './effectPresets/godRays';
import { glitchVhsEffect } from './effectPresets/glitchVhs';
import { beatPulseEffect } from './effectPresets/beatPulse';
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
  // --- Motor de efeitos criativos ---
  // Aura/energia na pessoa
  auraEnergyEffect,
  rimNeonEffect,
  // Movimento e clones
  speedClonesEffect,
  ghostEchoEffect,
  lightTrailsEffect,
  freezeBackgroundEffect,
  // Fundo e cenário
  backgroundFocusEffect,
  backgroundReplaceEffect,
  particleDissolveEffect,
  portalEffect,
  // Ambiente e câmera
  ambientParticlesEffect,
  lightLeaksEffect,
  godRaysEffect,
  glitchVhsEffect,
  beatPulseEffect,
] as const satisfies readonly VideoEffectConfig[];

export const videoEffectIds = videoEffects.map((effect) => effect.id);

export function getVideoEffect(effectId?: string | null) {
  return videoEffects.find((effect) => effect.id === effectId) || null;
}

export function isVideoEffectId(effectId: string): effectId is VideoEffectId {
  return videoEffects.some((effect) => effect.id === effectId);
}
