import type { VideoEffectConfig } from '../effects.types';

export const backgroundReplaceEffect: VideoEffectConfig = {
  id: 'background_replace',
  name: 'Troca de cenário',
  shortDescription: 'Substitui o fundo por cenários animados procedurais.',
  longDescription:
    'Recorta a pessoa e troca o fundo por um cenário gerado em tempo real: espaço estrelado, chamas, grade neon, pôr do sol, aurora boreal ou chuva de código (matrix). A pessoa recebe uma luz de borda que combina com a cena. Sem detecção, o cenário preenche a tela toda.',
  category: 'scene',
  intensity: 'high',
  recommendedFor: ['vídeos virais', 'gamer', 'sci-fi', 'aberturas'],
  visualBehavior: ['Fundo substituído por cenário', 'Cenário animado', 'Luz de borda na pessoa'],
  parameters: {
    scene: 'space',
  },
  previewStyle: {
    accent: '#7a6cff',
    cardClass: 'border-indigo-400/25 bg-indigo-500/[0.07]',
    previewFilter: 'contrast(1.18) saturate(1.5) brightness(1.04)',
    overlayClass: 'bg-[radial-gradient(circle_at_50%_40%,rgba(120,100,255,0.25),transparent_60%)]',
  },
  badge: 'IA',
  isPremium: true,
  isAI: true,
  engine: true,
  needsPerson: true,
  requiredFeature: 'ai_auto_edit',
  controls: [
    {
      type: 'select',
      key: 'scene',
      label: 'Cenário',
      options: [
        { value: 'space', label: 'Espaço estrelado' },
        { value: 'fire', label: 'Chamas' },
        { value: 'neon', label: 'Grade neon' },
        { value: 'sunset', label: 'Pôr do sol' },
        { value: 'aurora', label: 'Aurora boreal' },
        { value: 'matrix', label: 'Matrix' },
      ],
    },
  ],
};
