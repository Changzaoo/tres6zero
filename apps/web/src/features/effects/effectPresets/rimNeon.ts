import type { VideoEffectConfig } from '../effects.types';

export const rimNeonEffect: VideoEffectConfig = {
  id: 'rim_neon',
  name: 'Contorno neon',
  shortDescription: 'Rim light neon pulsante ao redor da pessoa.',
  longDescription:
    'Detecta a pessoa e desenha um contorno de luz neon brilhante ao redor da silhueta, com a cor ciclando e pulsando na batida da música. Espessura e brilho reagem à intensidade. Cores: ciano, rosa, verde, roxo, dourado e branco.',
  category: 'aura',
  intensity: 'high',
  recommendedFor: ['vídeos virais', 'baladas', 'cyberpunk', 'gamer'],
  visualBehavior: ['Contorno neon brilhante', 'Cor ciclando na batida', 'Glow pulsante na silhueta'],
  parameters: {
    color: 'cyan',
    intensity: 1,
  },
  previewStyle: {
    accent: '#38e6f0',
    cardClass: 'border-cyan-300/25 bg-cyan-500/[0.06]',
    previewFilter: 'contrast(1.14) saturate(1.4) brightness(1.04)',
    overlayClass: 'bg-[radial-gradient(circle_at_50%_50%,rgba(56,230,240,0.18),transparent_62%)] mix-blend-screen',
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
      label: 'Cor do neon',
      options: [
        { value: 'cyan', label: 'Ciano' },
        { value: 'pink', label: 'Rosa' },
        { value: 'green', label: 'Verde' },
        { value: 'purple', label: 'Roxo' },
        { value: 'gold', label: 'Dourado' },
        { value: 'white', label: 'Branco' },
      ],
    },
    { type: 'slider', key: 'intensity', label: 'Intensidade', min: 0.2, max: 2, step: 0.1 },
  ],
};
