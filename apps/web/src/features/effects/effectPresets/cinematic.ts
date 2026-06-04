import type { VideoEffectConfig } from '../effects.types';

export const cinematicEffect: VideoEffectConfig = {
  id: 'cinematic',
  name: 'Cinematic',
  shortDescription: 'Contraste, vinheta e acabamento de filme.',
  longDescription: 'Aplica color grading dramatico, vinheta leve e barras cinematograficas opcionais para um resultado premium.',
  category: 'premium',
  intensity: 'medium',
  recommendedFor: ['casamentos', 'eventos de luxo', 'vídeos promocionais'],
  visualBehavior: [
    'Contraste mais forte',
    'Saturacao levemente reduzida',
    'Vinheta e fades suaves',
  ],
  parameters: {
    contrast: 18,
    saturation: -8,
    temperature: 'warm',
    vignette: 20,
    cinematicBars: true,
    fadeIn: 0.5,
    fadeOut: 0.5,
  },
  previewStyle: {
    accent: '#f8fafc',
    cardClass: 'border-white/14 bg-zinc-900/50',
    previewFilter: 'contrast(1.12) saturate(0.95) brightness(0.94)',
    overlayClass: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.28),transparent_22%,transparent_78%,rgba(0,0,0,0.32))]',
  },
  badge: 'Filme',
  isPremium: true,
  requiredFeature: 'popular_effects',
};
