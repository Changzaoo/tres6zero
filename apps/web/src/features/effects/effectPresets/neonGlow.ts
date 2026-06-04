import type { VideoEffectConfig } from '../effects.types';

export const neonGlowEffect: VideoEffectConfig = {
  id: 'neon',
  name: 'Neon glow',
  shortDescription: 'Brilho futurista com cores neon.',
  longDescription: 'Realca luzes, satura cores e adiciona glow em tons de roxo, cyan e rosa.',
  category: 'party',
  intensity: 'high',
  recommendedFor: ['baladas', 'festas jovens', 'eventos com LED'],
  visualBehavior: [
    'Saturacao alta',
    'Glow colorido',
    'Realce em áreas claras',
  ],
  parameters: {
    saturation: 25,
    contrast: 12,
    glowIntensity: 35,
    highlightBoost: 20,
    neonColors: ['purple', 'cyan', 'pink'],
    bloom: 'medium',
  },
  previewStyle: {
    accent: '#22d3ee',
    cardClass: 'border-cyan-300/25 bg-cyan-500/[0.08]',
    previewFilter: 'contrast(1.18) saturate(1.55) hue-rotate(8deg)',
    overlayClass: 'bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(139,92,246,0.2),rgba(236,72,153,0.12))] mix-blend-screen',
  },
  badge: 'Popular',
  isPremium: true,
  requiredFeature: 'popular_effects',
};
