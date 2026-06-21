import type { VideoEffectConfig } from '../effects.types';

export const auraEnergyEffect: VideoEffectConfig = {
  id: 'aura_energy',
  name: 'Aura de energia',
  shortDescription: 'Aura estilo Dragon Ball Z ao redor da pessoa.',
  longDescription:
    'Detecta a pessoa na cena e cria uma aura de energia pulsante ao redor da silhueta, com faíscas subindo, brilho no chão e tremor de tela na batida. Estilos: Super Saiyajin (dourado), Kamehameha (azul), Divino (vermelho) e Ultra (roxo).',
  category: 'aura',
  intensity: 'high',
  recommendedFor: ['vídeos virais', 'cosplay', 'aberturas épicas', 'gamer'],
  visualBehavior: ['Aura ao redor do corpo', 'Faíscas de energia', 'Tremor e brilho no chão'],
  parameters: {
    style: 'super_saiyan',
    color: '',
    density: 1,
  },
  previewStyle: {
    accent: '#ffd140',
    cardClass: 'border-amber-300/25 bg-amber-500/[0.06]',
    previewFilter: 'contrast(1.16) saturate(1.4) brightness(1.06)',
    overlayClass: 'bg-[radial-gradient(circle_at_50%_60%,rgba(255,209,64,0.22),transparent_60%)]',
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
      key: 'style',
      label: 'Estilo',
      options: [
        { value: 'super_saiyan', label: 'Super Saiyajin (dourado)' },
        { value: 'kamehameha', label: 'Kamehameha (azul)' },
        { value: 'god', label: 'Divino (vermelho)' },
        { value: 'ultra', label: 'Ultra (roxo)' },
      ],
    },
    { type: 'slider', key: 'density', label: 'Intensidade da energia', min: 0.2, max: 2, step: 0.1 },
  ],
};
