import type { VideoEffectConfig } from '../effects.types';

export const speedClonesEffect: VideoEffectConfig = {
  id: 'speed_clones',
  name: 'Clones de velocidade',
  shortDescription: 'Rastro de clones estilo Flash/Naruto.',
  longDescription:
    'Isola a pessoa e deixa um rastro de clones (afterimage) capturados ao longo do movimento, com transparência crescente e deslocamento na direção do deslocamento. O fundo permanece nítido e o frame atual fica por cima. Ideal para cenas de movimento rápido.',
  category: 'fx_motion',
  intensity: 'high',
  recommendedFor: ['vídeos virais', 'dança', 'esportes', 'gamer'],
  visualBehavior: ['Clones em rastro', 'Transparência crescente', 'Deslocamento na direção do movimento'],
  parameters: {
    clones: 4,
    spacing: 3,
    tint: '',
  },
  previewStyle: {
    accent: '#a85cff',
    cardClass: 'border-violet-300/25 bg-violet-500/[0.06]',
    previewFilter: 'contrast(1.1) saturate(1.2)',
    overlayClass: 'bg-[linear-gradient(90deg,rgba(168,92,255,0.14),transparent_70%)]',
  },
  badge: 'IA',
  isPremium: true,
  isAI: true,
  engine: true,
  needsPerson: true,
  requiredFeature: 'ai_auto_edit',
  controls: [
    { type: 'slider', key: 'clones', label: 'Número de clones', min: 2, max: 6, step: 1 },
    { type: 'slider', key: 'spacing', label: 'Espaçamento', min: 1, max: 6, step: 1 },
  ],
};
