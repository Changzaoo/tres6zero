import type { VideoEffectConfig } from '../effects.types';

export const freezeBackgroundEffect: VideoEffectConfig = {
  id: 'freeze_background',
  name: 'Cenário congelado',
  shortDescription: 'Congela o fundo; só a pessoa se move.',
  longDescription:
    'Captura o cenário uma única vez e o mantém estático enquanto apenas a pessoa continua se movendo por cima. Útil para clipes surreais de "tempo parado". Permite leve dessaturação do fundo para destacar a pessoa.',
  category: 'fx_motion',
  intensity: 'medium',
  recommendedFor: ['vídeos virais', 'clipes', 'efeito tempo parado', 'criativo'],
  visualBehavior: ['Fundo congelado', 'Pessoa em movimento', 'Dessaturação opcional do cenário'],
  parameters: {
    desaturate: 0.2,
  },
  previewStyle: {
    accent: '#94a3b8',
    cardClass: 'border-slate-300/25 bg-slate-500/[0.06]',
    previewFilter: 'contrast(1.06) saturate(0.85)',
    overlayClass: 'bg-[radial-gradient(circle_at_50%_50%,rgba(148,163,184,0.12),transparent_66%)]',
  },
  badge: 'IA',
  isPremium: true,
  isAI: true,
  engine: true,
  needsPerson: true,
  requiredFeature: 'ai_auto_edit',
  controls: [
    { type: 'slider', key: 'desaturate', label: 'Dessaturar fundo', min: 0, max: 1, step: 0.05 },
  ],
};
