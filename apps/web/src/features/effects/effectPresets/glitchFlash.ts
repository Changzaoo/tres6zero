import type { VideoEffectConfig } from '../effects.types';

export const glitchFlashEffect: VideoEffectConfig = {
  id: 'glitch_flash',
  name: 'Glitch flash',
  shortDescription: 'Falhas digitais e flashes rapidos.',
  longDescription: 'Cria distorcoes horizontais, separacao RGB e flashes curtos em transicoes e batidas.',
  category: 'party',
  intensity: 'high',
  recommendedFor: ['eventos tecnologicos', 'lancamentos', 'festas modernas'],
  visualBehavior: [
    'Flash curto',
    'Distorcao horizontal',
    'Separacao RGB controlada',
  ],
  parameters: {
    glitchIntensity: 25,
    rgbSplit: 8,
    flashDuration: 0.08,
    glitchFrequency: 'medium',
    transitionGlitch: true,
  },
  previewStyle: {
    accent: '#a78bfa',
    cardClass: 'border-violet-300/25 bg-violet-500/[0.08]',
    previewFilter: 'contrast(1.25) saturate(1.35)',
    overlayClass: 'bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_2px,transparent_2px,transparent_18px)] mix-blend-screen',
  },
  isPremium: true,
  requiredFeature: 'popular_effects',
};
