import type { VideoEffectConfig } from '../effects.types';

export const cleanEffect: VideoEffectConfig = {
  id: 'clean',
  name: 'Clean',
  shortDescription: 'Visual limpo, natural e profissional.',
  longDescription: 'Melhora brilho, contraste e nitidez de forma leve, mantendo cores naturais e sem efeitos chamativos.',
  category: 'basic',
  intensity: 'low',
  recommendedFor: ['corporativo', 'eventos simples', 'entregas rapidas'],
  visualBehavior: [
    'Correções leves de brilho e contraste',
    'Nitidez discreta',
    'Transicoes suaves no início e no final',
  ],
  parameters: {
    brightness: 4,
    contrast: 8,
    saturation: -2,
    sharpness: 10,
    fadeIn: 0.3,
    fadeOut: 0.3,
  },
  previewStyle: {
    accent: '#dbeafe',
    cardClass: 'border-white/12 bg-white/[0.045]',
    previewFilter: 'contrast(1.05) saturate(1.08) brightness(1.01)',
  },
  badge: 'Padrão',
  requiredFeature: 'basic_effects',
};
