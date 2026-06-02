import type { VideoEffectConfig } from '../effects.types';

export const weddingSoftEffect: VideoEffectConfig = {
  id: 'wedding_soft',
  name: 'Wedding soft',
  shortDescription: 'Romantico, claro e delicado.',
  longDescription: 'Suaviza contraste, aquece a imagem e adiciona glow leve para casamentos e momentos emocionais.',
  category: 'premium',
  intensity: 'medium',
  recommendedFor: ['casamentos', 'familia', 'eventos delicados'],
  visualBehavior: [
    'Brilho leve',
    'Contraste suave',
    'Glow romantico',
  ],
  parameters: {
    brightness: 8,
    contrast: -5,
    saturation: 5,
    warmth: 8,
    softGlow: 18,
    skinSmoothing: 'light',
    fadeIn: 0.6,
    fadeOut: 0.6,
  },
  previewStyle: {
    accent: '#fbcfe8',
    cardClass: 'border-rose-200/25 bg-rose-300/[0.07]',
    previewFilter: 'contrast(0.98) saturate(1.05) brightness(1.05) blur(0.25px)',
    overlayClass: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(244,114,182,0.08),transparent)] mix-blend-screen',
  },
  isPremium: true,
  requiredFeature: 'popular_effects',
};
