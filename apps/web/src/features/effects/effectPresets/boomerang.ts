import type { VideoEffectConfig } from '../effects.types';

export const boomerangEffect: VideoEffectConfig = {
  id: 'boomerang',
  name: 'Boomerang',
  shortDescription: 'Loop curto, divertido, indo e voltando.',
  longDescription: 'Reproduz o vídeo para frente e depois em reverso para criar um clipe dinâmico de cabine 360.',
  category: 'motion',
  intensity: 'medium',
  recommendedFor: ['festas', 'aniversarios', 'poses rapidas'],
  visualBehavior: [
    'Trecho curto para frente',
    'Reverso automático',
    'Loop com ritmo rápido',
  ],
  parameters: {
    forwardDuration: 3,
    reverse: true,
    loop: true,
    playbackRate: 1,
    finalDurationMin: 4,
    finalDurationMax: 8,
  },
  previewStyle: {
    accent: '#38bdf8',
    cardClass: 'border-cyan-300/20 bg-cyan-500/[0.075]',
    previewFilter: 'contrast(1.08) saturate(1.12)',
    overlayClass: 'bg-[conic-gradient(from_120deg_at_50%_50%,rgba(34,211,238,0.16),transparent,rgba(139,92,246,0.14),transparent)]',
  },
  badge: 'Popular',
  requiredFeature: 'basic_effects',
};
