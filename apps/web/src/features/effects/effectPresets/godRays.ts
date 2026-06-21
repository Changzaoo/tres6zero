import type { VideoEffectConfig } from '../effects.types';

export const godRaysEffect: VideoEffectConfig = {
  id: 'god_rays',
  name: 'Raios de luz',
  shortDescription: 'Feixes volumétricos de luz com poeira flutuante.',
  longDescription:
    'Projeta raios de luz volumétricos (god rays) saindo de um ponto no alto do quadro, com um leque de feixes oscilantes, brilho central e poeira luminosa flutuando dentro da luz. Ajuste o ângulo da fonte, a cor (dourado, branco, azul ou verde) e a intensidade.',
  category: 'ambient',
  intensity: 'medium',
  recommendedFor: ['clima épico', 'natureza', 'aberturas', 'clipes'],
  visualBehavior: ['Feixes de luz radiais', 'Brilho na fonte', 'Poeira luminosa'],
  parameters: {
    color: 'gold',
    angle: 0.25,
    intensity: 1,
  },
  previewStyle: {
    accent: '#ffdc82',
    cardClass: 'border-amber-200/25 bg-amber-400/[0.06]',
    previewFilter: 'contrast(1.06) saturate(1.15) brightness(1.08)',
    overlayClass: 'bg-[linear-gradient(160deg,rgba(255,220,130,0.22),transparent_65%)] mix-blend-screen',
  },
  badge: 'Novo',
  isPremium: true,
  engine: true,
  requiredFeature: 'popular_effects',
  controls: [
    {
      type: 'select',
      key: 'color',
      label: 'Cor',
      options: [
        { value: 'gold', label: 'Dourado' },
        { value: 'white', label: 'Branco' },
        { value: 'blue', label: 'Azul' },
        { value: 'green', label: 'Verde' },
      ],
    },
    { type: 'slider', key: 'angle', label: 'Ângulo da fonte', min: 0, max: 1, step: 0.05 },
    { type: 'slider', key: 'intensity', label: 'Intensidade', min: 0.3, max: 2, step: 0.1 },
  ],
};
