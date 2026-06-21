import type { VideoEffectConfig } from '../effects.types';

export const backgroundFocusEffect: VideoEffectConfig = {
  id: 'background_focus',
  name: 'Foco no retrato',
  shortDescription: 'Fundo desfocado e a pessoa em destaque, estilo cinema.',
  longDescription:
    'Detecta a pessoa e mantém apenas ela nítida, enquanto o fundo recebe desfoque, escurecimento e dessaturação cinematográficos. Adiciona um leve glow de contorno e vinheta para um retrato profissional. Ajuste desfoque, escurecimento e dessaturação ao seu gosto.',
  category: 'scene',
  intensity: 'medium',
  recommendedFor: ['retratos', 'entrevistas', 'vlogs', 'reels'],
  visualBehavior: ['Fundo desfocado', 'Pessoa nítida em destaque', 'Vinheta cinematográfica'],
  parameters: {
    blur: 10,
    darken: 0.35,
    desaturate: 0.5,
  },
  previewStyle: {
    accent: '#e8e0d0',
    cardClass: 'border-stone-300/25 bg-stone-500/[0.06]',
    previewFilter: 'contrast(1.1) saturate(0.85) brightness(0.96)',
    overlayClass: 'bg-[radial-gradient(circle_at_50%_50%,transparent_45%,rgba(0,0,0,0.45)_100%)]',
  },
  badge: 'IA',
  isPremium: true,
  isAI: true,
  engine: true,
  needsPerson: true,
  requiredFeature: 'ai_auto_edit',
  controls: [
    { type: 'slider', key: 'blur', label: 'Desfoque do fundo', min: 0, max: 24, step: 1 },
    { type: 'slider', key: 'darken', label: 'Escurecer fundo', min: 0, max: 0.8, step: 0.05 },
    { type: 'slider', key: 'desaturate', label: 'Dessaturar fundo', min: 0, max: 1, step: 0.05 },
  ],
};
