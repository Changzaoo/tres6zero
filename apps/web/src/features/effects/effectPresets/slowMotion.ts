import type { VideoEffectConfig } from '../effects.types';

export const slowMotionEffect: VideoEffectConfig = {
  id: 'slow_motion',
  name: 'Slow motion',
  shortDescription: 'Movimento suave para momentos de destaque.',
  longDescription: 'Reduz a velocidade do vídeo e adiciona uma sensacao mais dramatica para giros e entradas importantes.',
  category: 'motion',
  intensity: 'medium',
  recommendedFor: ['casamentos', 'eventos premium', 'momentos especiais'],
  visualBehavior: [
    'Velocidade reduzida',
    'Leve desfoque de movimento',
    'Fade suave para um acabamento elegante',
  ],
  parameters: {
    playbackRate: 0.55,
    motionBlur: 'light',
    stabilization: true,
    fadeIn: 0.4,
    fadeOut: 0.5,
  },
  previewStyle: {
    accent: '#93c5fd',
    cardClass: 'border-blue-300/20 bg-blue-500/[0.08]',
    previewFilter: 'contrast(1.04) saturate(1.08)',
    overlayClass: 'bg-[radial-gradient(circle_at_30%_20%,rgba(147,197,253,0.16),transparent_35%)]',
  },
  requiredFeature: 'basic_effects',
};
