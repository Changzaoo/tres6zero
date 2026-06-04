import type { VideoEffectConfig } from '../effects.types';

export const partyPopEffect: VideoEffectConfig = {
  id: 'party',
  name: 'Party pop',
  shortDescription: 'Cores vivas e energia de festa.',
  longDescription: 'Aumenta saturacao, contraste e adiciona flashes leves para uma entrega alegre e social.',
  category: 'party',
  intensity: 'high',
  recommendedFor: ['aniversarios', 'formaturas', 'festas'],
  visualBehavior: [
    'Cores mais vibrantes',
    'Batidas visuais leves',
    'Opção de confetes e stickers',
  ],
  parameters: {
    saturation: 30,
    contrast: 15,
    flashBeats: true,
    confettiOverlay: 'optional',
    playbackRate: 1.05,
    musicSync: true,
  },
  previewStyle: {
    accent: '#f472b6',
    cardClass: 'border-pink-300/25 bg-pink-500/[0.08]',
    previewFilter: 'contrast(1.12) saturate(1.35)',
    overlayClass: 'bg-[linear-gradient(135deg,rgba(34,197,94,0.12),rgba(59,130,246,0.14),rgba(236,72,153,0.16))] mix-blend-screen',
  },
  badge: 'Popular',
  isPremium: true,
  requiredFeature: 'popular_effects',
};
