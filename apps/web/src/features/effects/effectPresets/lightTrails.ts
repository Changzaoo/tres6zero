import type { VideoEffectConfig } from '../effects.types';

export const lightTrailsEffect: VideoEffectConfig = {
  id: 'light_trails',
  name: 'Rastros de luz',
  shortDescription: 'Trilhas brilhantes seguindo o movimento.',
  longDescription:
    'Emite partículas brilhantes no centro da pessoa que permanecem e desbotam, formando trilhas de luz que seguem o movimento. Uma fita suave conecta o caminho recente. Sem pessoa, o rastro percorre a tela num caminho hipnótico. Cores configuráveis.',
  category: 'fx_motion',
  intensity: 'medium',
  recommendedFor: ['vídeos virais', 'dança', 'clipes', 'transições'],
  visualBehavior: ['Partículas em trilha', 'Fita de luz no caminho', 'Brilho aditivo'],
  parameters: {
    color: 'cyan',
    length: 1,
  },
  previewStyle: {
    accent: '#38e6f0',
    cardClass: 'border-cyan-300/25 bg-cyan-500/[0.06]',
    previewFilter: 'contrast(1.1) saturate(1.3) brightness(1.05)',
    overlayClass: 'bg-[linear-gradient(120deg,rgba(56,230,240,0.16),transparent_70%)] mix-blend-screen',
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
      label: 'Cor do rastro',
      options: [
        { value: 'cyan', label: 'Ciano' },
        { value: 'pink', label: 'Rosa' },
        { value: 'green', label: 'Verde' },
        { value: 'purple', label: 'Roxo' },
        { value: 'gold', label: 'Dourado' },
        { value: 'white', label: 'Branco' },
      ],
    },
    { type: 'slider', key: 'length', label: 'Comprimento do rastro', min: 0.3, max: 2, step: 0.1 },
  ],
};
