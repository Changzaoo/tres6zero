import type { VideoEffectConfig } from '../effects.types';

export const beatPulseEffect: VideoEffectConfig = {
  id: 'beat_pulse',
  name: 'Pulso na batida',
  shortDescription: 'Câmera com zoom e flash reagindo à música.',
  longDescription:
    'A câmera reage à batida da música: um "punch" de zoom e leve tremor proporcionais à energia do áudio, e nos picos um flash de cor com leve aberração cromática. Perfeito para clipes, edições musicais e transições no ritmo. Cor do flash e força ajustáveis.',
  category: 'ambient',
  intensity: 'high',
  recommendedFor: ['clipes musicais', 'dança', 'edições no ritmo', 'vídeos virais'],
  visualBehavior: ['Zoom na batida', 'Tremor reativo', 'Flash de cor nos picos'],
  parameters: {
    color: 'white',
    strength: 1,
  },
  previewStyle: {
    accent: '#ffffff',
    cardClass: 'border-white/25 bg-white/[0.06]',
    previewFilter: 'contrast(1.12) saturate(1.2) brightness(1.05)',
    overlayClass: 'bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.18),transparent_60%)] mix-blend-screen',
  },
  badge: 'Novo',
  isPremium: true,
  engine: true,
  requiredFeature: 'popular_effects',
  controls: [
    {
      type: 'select',
      key: 'color',
      label: 'Cor do flash',
      options: [
        { value: 'white', label: 'Branco' },
        { value: 'gold', label: 'Dourado' },
        { value: 'cyan', label: 'Ciano' },
        { value: 'pink', label: 'Rosa' },
      ],
    },
    { type: 'slider', key: 'strength', label: 'Força', min: 0.3, max: 2, step: 0.1 },
  ],
};
