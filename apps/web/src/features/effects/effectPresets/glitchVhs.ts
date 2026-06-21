import type { VideoEffectConfig } from '../effects.types';

export const glitchVhsEffect: VideoEffectConfig = {
  id: 'glitch_vhs',
  name: 'Glitch / VHS',
  shortDescription: 'Distorções digitais e estética de fita VHS.',
  longDescription:
    'Distorce o vídeo com glitches digitais e estética analógica. Estilos: VHS (tracking, ruído e descoloração), datamosh (blocos deslocados), aberração cromática nas bordas, scanlines com brilho CRT e separação RGB. Glitches pontuais surgem ao longo do tempo. Intensidade ajustável.',
  category: 'ambient',
  intensity: 'high',
  recommendedFor: ['estética retrô', 'gamer', 'clipes', 'transições'],
  visualBehavior: ['Distorção do vídeo', 'Fatias deslocadas', 'Ruído e descoloração'],
  parameters: {
    style: 'vhs',
    intensity: 1,
  },
  previewStyle: {
    accent: '#8b5cf6',
    cardClass: 'border-violet-300/25 bg-violet-500/[0.06]',
    previewFilter: 'contrast(1.16) saturate(1.3) hue-rotate(-6deg)',
    overlayClass: 'bg-[linear-gradient(90deg,rgba(255,0,80,0.12),transparent,rgba(0,160,255,0.12))] mix-blend-screen',
  },
  badge: 'Novo',
  isPremium: true,
  engine: true,
  requiredFeature: 'popular_effects',
  controls: [
    {
      type: 'select',
      key: 'style',
      label: 'Estilo',
      options: [
        { value: 'vhs', label: 'VHS' },
        { value: 'datamosh', label: 'Datamosh' },
        { value: 'chromatic', label: 'Aberração cromática' },
        { value: 'scanlines', label: 'Scanlines (CRT)' },
        { value: 'rgb_split', label: 'Separação RGB' },
      ],
    },
    { type: 'slider', key: 'intensity', label: 'Intensidade', min: 0.2, max: 2, step: 0.1 },
  ],
};
