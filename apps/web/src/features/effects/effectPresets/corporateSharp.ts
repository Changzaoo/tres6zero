import type { VideoEffectConfig } from '../effects.types';

export const corporateSharpEffect: VideoEffectConfig = {
  id: 'corporate_sharp',
  name: 'Corporate sharp',
  shortDescription: 'Nitido, limpo e institucional.',
  longDescription: 'Melhora nitidez, contraste e reducao visual de ruido para eventos empresariais e B2B.',
  category: 'corporate',
  intensity: 'medium',
  recommendedFor: ['feiras', 'palestras', 'ativacoes B2B'],
  visualBehavior: [
    'Nitidez maior',
    'Cores realistas',
    'Visual confiavel sem exageros',
  ],
  parameters: {
    sharpness: 25,
    contrast: 12,
    saturation: 4,
    noiseReduction: 'medium',
    brightness: 3,
    stabilization: true,
  },
  previewStyle: {
    accent: '#60a5fa',
    cardClass: 'border-blue-300/20 bg-slate-400/[0.06]',
    previewFilter: 'contrast(1.08) saturate(0.92)',
    overlayClass: 'bg-[linear-gradient(135deg,rgba(59,130,246,0.08),transparent_55%)]',
  },
  isPremium: true,
  requiredFeature: 'popular_effects',
};
