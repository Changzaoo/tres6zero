import type { VideoEffectConfig } from '../effects.types';

export const ambientParticlesEffect: VideoEffectConfig = {
  id: 'ambient_particles',
  name: 'Partículas ambientais',
  shortDescription: 'Faíscas, neve, brasas, vaga-lumes e mais pela tela.',
  longDescription:
    'Emite partículas pela tela inteira com física própria por tipo: faíscas douradas subindo, neve caindo devagar, brasas laranja flutuando, vaga-lumes piscando, confete colorido girando, pétalas balançando ou poeira luminosa. A densidade reage levemente à batida da música.',
  category: 'ambient',
  intensity: 'medium',
  recommendedFor: ['clima', 'aberturas', 'celebrações', 'clipes'],
  visualBehavior: ['Partículas pela tela', 'Física por tipo', 'Densidade reage ao áudio'],
  parameters: {
    kind: 'sparks',
    density: 1,
  },
  previewStyle: {
    accent: '#ffd140',
    cardClass: 'border-amber-300/25 bg-amber-500/[0.06]',
    previewFilter: 'contrast(1.08) saturate(1.2) brightness(1.05)',
    overlayClass: 'bg-[radial-gradient(circle_at_50%_30%,rgba(255,209,64,0.16),transparent_60%)]',
  },
  badge: 'Novo',
  isPremium: true,
  engine: true,
  requiredFeature: 'popular_effects',
  controls: [
    {
      type: 'select',
      key: 'kind',
      label: 'Tipo',
      options: [
        { value: 'sparks', label: 'Faíscas (douradas)' },
        { value: 'snow', label: 'Neve' },
        { value: 'embers', label: 'Brasas' },
        { value: 'fireflies', label: 'Vaga-lumes' },
        { value: 'confetti', label: 'Confete' },
        { value: 'petals', label: 'Pétalas' },
        { value: 'dust', label: 'Poeira luminosa' },
      ],
    },
    { type: 'slider', key: 'density', label: 'Densidade', min: 0.3, max: 2, step: 0.1 },
  ],
};
