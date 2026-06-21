import type { VideoEffectConfig } from '../effects.types';

export const particleDissolveEffect: VideoEffectConfig = {
  id: 'particle_dissolve',
  name: 'Dissolução em partículas',
  shortDescription: 'A pessoa se desfaz em partículas levadas pelo vento.',
  longDescription:
    'Efeito estilo Thanos: a silhueta da pessoa se desintegra progressivamente em partículas de brasa ou cinza, carregadas pelo vento. O apagamento varre o corpo de um lado ao outro e pulsa em loop. Escolha a cor das partículas e a velocidade da dissolução.',
  category: 'scene',
  intensity: 'high',
  recommendedFor: ['vídeos virais', 'transições', 'efeitos épicos', 'cosplay'],
  visualBehavior: ['Pessoa se desintegrando', 'Partículas ao vento', 'Apagamento progressivo'],
  parameters: {
    color: 'ember',
    direction: 0.2,
    speed: 1,
  },
  previewStyle: {
    accent: '#ff8c32',
    cardClass: 'border-orange-400/25 bg-orange-500/[0.07]',
    previewFilter: 'contrast(1.15) saturate(1.25) brightness(1.02)',
    overlayClass: 'bg-[radial-gradient(circle_at_60%_50%,rgba(255,140,50,0.2),transparent_60%)]',
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
      label: 'Cor das partículas',
      options: [
        { value: 'ember', label: 'Brasa' },
        { value: 'ash', label: 'Cinza' },
        { value: 'gold', label: 'Ouro' },
      ],
    },
    { type: 'slider', key: 'speed', label: 'Velocidade', min: 0.3, max: 2, step: 0.1 },
  ],
};
