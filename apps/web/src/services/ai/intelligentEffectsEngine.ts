// Intelligent Effects Engine
import type { IntelligentEffect, EffectTarget, AuraType, EffectPhysics, EffectCategory } from '@six3/shared/src/types';

export interface AuraPreset {
  type: AuraType;
  primaryColor: { r: number; g: number; b: number };
  secondaryColor: { r: number; g: number; b: number };
  particleDensity: number;
  animationSpeed: number;
  glowIntensity: number;
  physics: Partial<EffectPhysics>;
}

export const AURA_PRESETS: Record<AuraType, AuraPreset> = {
  fire: { type: 'fire', primaryColor: { r: 255, g: 100, b: 0 }, secondaryColor: { r: 255, g: 200, b: 50 }, particleDensity: 0.8, animationSpeed: 1.5, glowIntensity: 1.2, physics: { turbulence: 0.3 } },
  electric: { type: 'electric', primaryColor: { r: 100, g: 150, b: 255 }, secondaryColor: { r: 200, g: 220, b: 255 }, particleDensity: 0.6, animationSpeed: 2.0, glowIntensity: 1.5, physics: { turbulence: 0.8 } },
  divine: { type: 'divine', primaryColor: { r: 255, g: 250, b: 220 }, secondaryColor: { r: 255, g: 215, b: 0 }, particleDensity: 0.9, animationSpeed: 0.8, glowIntensity: 1.8, physics: { turbulence: 0.1 } },
  angelic: { type: 'angelic', primaryColor: { r: 255, g: 255, b: 255 }, secondaryColor: { r: 200, g: 220, b: 255 }, particleDensity: 1.0, animationSpeed: 0.6, glowIntensity: 2.0, physics: { turbulence: 0.05 } },
  demonic: { type: 'demonic', primaryColor: { r: 150, g: 0, b: 50 }, secondaryColor: { r: 255, g: 100, b: 0 }, particleDensity: 0.85, animationSpeed: 1.3, glowIntensity: 1.4, physics: { turbulence: 0.4 } },
  anime: { type: 'anime', primaryColor: { r: 255, g: 200, b: 50 }, secondaryColor: { r: 255, g: 255, b: 200 }, particleDensity: 0.75, animationSpeed: 1.8, glowIntensity: 1.6, physics: { turbulence: 0.2 } },
  cosmic: { type: 'cosmic', primaryColor: { r: 100, g: 50, b: 150 }, secondaryColor: { r: 200, g: 100, b: 255 }, particleDensity: 0.95, animationSpeed: 0.5, glowIntensity: 1.3, physics: { turbulence: 0.3 } },
  galactic: { type: 'galactic', primaryColor: { r: 50, g: 0, b: 100 }, secondaryColor: { r: 150, g: 50, b: 200 }, particleDensity: 1.0, animationSpeed: 0.4, glowIntensity: 1.7, physics: { turbulence: 0.2 } },
  energy: { type: 'energy', primaryColor: { r: 0, g: 200, b: 255 }, secondaryColor: { r: 150, g: 255, b: 255 }, particleDensity: 0.7, animationSpeed: 2.2, glowIntensity: 1.4, physics: { turbulence: 0.5 } },
  neon: { type: 'neon', primaryColor: { r: 255, g: 0, b: 150 }, secondaryColor: { r: 0, g: 255, b: 200 }, particleDensity: 0.65, animationSpeed: 1.6, glowIntensity: 2.0, physics: { turbulence: 0.6 } },
  magic: { type: 'magic', primaryColor: { r: 150, g: 100, b: 255 }, secondaryColor: { r: 255, g: 200, b: 100 }, particleDensity: 0.8, animationSpeed: 1.0, glowIntensity: 1.5, physics: { turbulence: 0.25 } },
  spiritual: { type: 'spiritual', primaryColor: { r: 200, g: 220, b: 255 }, secondaryColor: { r: 255, g: 250, b: 230 }, particleDensity: 0.9, animationSpeed: 0.7, glowIntensity: 1.6, physics: { turbulence: 0.1 } },
  golden: { type: 'golden', primaryColor: { r: 255, g: 215, b: 0 }, secondaryColor: { r: 255, g: 245, b: 180 }, particleDensity: 0.85, animationSpeed: 0.9, glowIntensity: 1.9, physics: { turbulence: 0.15 } },
  blue: { type: 'blue', primaryColor: { r: 50, g: 100, b: 255 }, secondaryColor: { r: 150, g: 200, b: 255 }, particleDensity: 0.7, animationSpeed: 1.1, glowIntensity: 1.3, physics: { turbulence: 0.3 } },
  rainbow: { type: 'rainbow', primaryColor: { r: 255, g: 0, b: 0 }, secondaryColor: { r: 255, g: 255, b: 0 }, particleDensity: 1.0, animationSpeed: 1.4, glowIntensity: 1.7, physics: { turbulence: 0.35 } },
  custom: { type: 'custom', primaryColor: { r: 128, g: 128, b: 128 }, secondaryColor: { r: 200, g: 200, b: 200 }, particleDensity: 0.7, animationSpeed: 1.0, glowIntensity: 1.0, physics: { turbulence: 0.2 } },
};

export function createEffect(params: { id: string; name: string; category: EffectCategory; target: EffectTarget; auraType?: AuraType; startFrame?: number; endFrame?: number; intensity?: number }): IntelligentEffect {
  const preset = params.auraType ? AURA_PRESETS[params.auraType] : null;
  return { id: params.id, name: params.name, description: params.auraType ? `Aura ${params.auraType}` : params.name, category: params.category, target: params.target, auraType: params.auraType, parameters: { primaryColor: preset?.primaryColor || { r: 128, g: 128, b: 128 }, secondaryColor: preset?.secondaryColor || { r: 200, g: 200, b: 200 }, density: preset?.particleDensity || 0.7, speed: preset?.animationSpeed || 1.0, glowIntensity: preset?.glowIntensity || 1.0 }, physics: { gravity: { x: 0, y: 0, z: 0 }, wind: { x: 0, y: 0, z: 0 }, turbulence: preset?.physics?.turbulence || 0.2, resistance: 0.1, collision: true, occlusion: true }, intensity: params.intensity || 1.0, startFrame: params.startFrame || 0, endFrame: params.endFrame || -1, enabled: true, visible: true, layer: 1, blendMode: 'screen', opacity: 1.0 };
}

export const EFFECT_PRESETS = {
  superSaiyan: () => createEffect({ id: 'ssg', name: 'Super Saiyan', category: 'aura', target: { type: 'person', id: '', position: { x: 0.5, y: 0.5 }, depth: 0, rotation: 0, scale: 1 }, auraType: 'anime' }),
  angelWings: () => createEffect({ id: 'wings', name: 'Asas de Anjo', category: 'environment', target: { type: 'person', id: '', position: { x: 0.5, y: 0.5 }, depth: 0, rotation: 0, scale: 1 }, auraType: 'angelic' }),
  cyberAura: () => createEffect({ id: 'cyber', name: 'Aura Cyberpunk', category: 'aura', target: { type: 'person', id: '', position: { x: 0.5, y: 0.5 }, depth: 0, rotation: 0, scale: 1 }, auraType: 'neon' }),
  divineGlow: () => createEffect({ id: 'divine', name: 'Brilho Divino', category: 'aura', target: { type: 'person', id: '', position: { x: 0.5, y: 0.5 }, depth: 0, rotation: 0, scale: 1 }, auraType: 'divine' }),
  cosmicEnergy: () => createEffect({ id: 'cosmic', name: 'Energia CÃ³smica', category: 'aura', target: { type: 'person', id: '', position: { x: 0.5, y: 0.5 }, depth: 0, rotation: 0, scale: 1 }, auraType: 'cosmic' }),
};

export const intelligentEffectsEngine = { auraPresets: AURA_PRESETS, presets: EFFECT_PRESETS, createEffect };
export default intelligentEffectsEngine;