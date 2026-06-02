import type { VideoEffectConfig } from '../effects.types';

export const luxuryGoldEffect: VideoEffectConfig = {
  id: 'luxury',
  name: 'Luxury gold',
  shortDescription: 'Tons dourados com acabamento sofisticado.',
  longDescription: 'Aquece a imagem, adiciona brilho dourado discreto e vinheta suave para eventos premium.',
  category: 'premium',
  intensity: 'medium',
  recommendedFor: ['casamentos', 'marcas premium', 'festas sofisticadas'],
  visualBehavior: [
    'Temperatura mais quente',
    'Glow dourado suave',
    'Contraste elegante',
  ],
  parameters: {
    temperature: 15,
    contrast: 14,
    saturation: 8,
    goldOverlay: 15,
    vignette: 15,
    glowIntensity: 12,
  },
  previewStyle: {
    accent: '#fbbf24',
    cardClass: 'border-amber-300/25 bg-amber-500/[0.08]',
    previewFilter: 'contrast(1.08) saturate(1.05) sepia(0.12)',
    overlayClass: 'bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(255,255,255,0.04),rgba(88,28,135,0.08))] mix-blend-screen',
  },
  badge: 'Premium',
  isPremium: true,
  requiredFeature: 'popular_effects',
};
