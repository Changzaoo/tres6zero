import type { VideoEffectConfig } from '../effects.types';

export const ghostEchoEffect: VideoEffectConfig = {
  id: 'ghost_echo',
  name: 'Eco fantasma',
  shortDescription: 'Projeção astral atrasada e translúcida.',
  longDescription:
    'Cria uma cópia atrasada (~0,3s) e semitransparente da pessoa, tingida e em blend aditivo, que arrasta atrás do movimento como uma projeção astral. Quanto mais a pessoa se move, mais o eco se descola do corpo. Cores configuráveis.',
  category: 'fx_motion',
  intensity: 'medium',
  recommendedFor: ['vídeos virais', 'clipes', 'terror/místico', 'dança'],
  visualBehavior: ['Cópia atrasada da pessoa', 'Blend translúcido', 'Arraste atrás do movimento'],
  parameters: {
    color: 'cyan',
    delay: 0.3,
    alpha: 0.5,
  },
  previewStyle: {
    accent: '#38e6f0',
    cardClass: 'border-cyan-300/25 bg-cyan-500/[0.06]',
    previewFilter: 'contrast(1.08) saturate(1.25) brightness(1.03)',
    overlayClass: 'bg-[radial-gradient(circle_at_50%_50%,rgba(56,230,240,0.14),transparent_64%)] mix-blend-screen',
  },
  badge: 'IA',
  isPremium: true,
  isAI: true,
  engine: true,
  needsPerson: true,
  requiredFeature: 'ai_auto_edit',
  controls: [
    {
      type: 'color',
      key: 'color',
      label: 'Cor do eco',
      options: [
        { value: 'cyan', label: 'Ciano' },
        { value: 'pink', label: 'Rosa' },
        { value: 'green', label: 'Verde' },
        { value: 'purple', label: 'Roxo' },
        { value: 'gold', label: 'Dourado' },
        { value: 'white', label: 'Branco' },
      ],
    },
    { type: 'slider', key: 'alpha', label: 'Transparência', min: 0.1, max: 0.9, step: 0.05 },
  ],
};
