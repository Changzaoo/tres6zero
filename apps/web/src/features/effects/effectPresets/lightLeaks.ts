import type { VideoEffectConfig } from '../effects.types';

export const lightLeaksEffect: VideoEffectConfig = {
  id: 'light_leaks',
  name: 'Vazamentos de luz',
  shortDescription: 'Manchas de luz analógicas entrando pelas bordas.',
  longDescription:
    'Recria os vazamentos de luz de câmeras analógicas: manchas suaves de cor que entram e saem pelas bordas do quadro, animadas por ruído e somadas em blend de tela. Paletas quente, dourada, rosa, teal ou arco-íris. Dá um clima nostálgico e cinematográfico.',
  category: 'ambient',
  intensity: 'medium',
  recommendedFor: ['estética retrô', 'clipes', 'aberturas', 'vlogs'],
  visualBehavior: ['Manchas de luz nas bordas', 'Animação por ruído', 'Blend de tela'],
  parameters: {
    color: 'warm',
    intensity: 1,
  },
  previewStyle: {
    accent: '#ff8c3c',
    cardClass: 'border-orange-300/25 bg-orange-500/[0.06]',
    previewFilter: 'contrast(1.06) saturate(1.2) brightness(1.06)',
    overlayClass: 'bg-[linear-gradient(120deg,rgba(255,140,60,0.2),transparent_70%)] mix-blend-screen',
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
        { value: 'warm', label: 'Quente' },
        { value: 'gold', label: 'Dourado' },
        { value: 'pink', label: 'Rosa' },
        { value: 'teal', label: 'Teal' },
        { value: 'rainbow', label: 'Arco-íris' },
      ],
    },
    { type: 'slider', key: 'intensity', label: 'Intensidade', min: 0.3, max: 2, step: 0.1 },
  ],
};
