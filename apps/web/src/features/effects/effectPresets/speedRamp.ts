import type { VideoEffectConfig } from '../effects.types';

export const speedRampEffect: VideoEffectConfig = {
  id: 'speed_ramp',
  name: 'Speed ramp',
  shortDescription: 'Acelera e desacelera no momento certo.',
  longDescription: 'Varia a velocidade do vídeo para aumentar impacto, com destaque no ponto principal do giro.',
  category: 'motion',
  intensity: 'high',
  recommendedFor: ['vídeos 360', 'festas', 'ativacoes de marca'],
  visualBehavior: [
    'Início em velocidade normal',
    'Aceleracao no meio',
    'Desaceleracao no destaque',
  ],
  parameters: {
    introSpeed: 1,
    middleSpeed: 1.75,
    highlightSpeed: 0.5,
    outroSpeed: 1,
    beatSync: true,
    motionBlur: 'medium',
  },
  previewStyle: {
    accent: '#818cf8',
    cardClass: 'border-indigo-300/25 bg-indigo-500/[0.09]',
    previewFilter: 'contrast(1.1) saturate(1.18)',
    overlayClass: 'bg-[linear-gradient(110deg,transparent,rgba(129,140,248,0.2),transparent)]',
  },
  badge: 'Popular',
  isPremium: true,
  requiredFeature: 'popular_effects',
};
