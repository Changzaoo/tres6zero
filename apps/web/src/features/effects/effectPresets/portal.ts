import type { VideoEffectConfig } from '../effects.types';

export const portalEffect: VideoEffectConfig = {
  id: 'portal',
  name: 'Portal de energia',
  shortDescription: 'Anel de energia giratório atrás da pessoa.',
  longDescription:
    'Cria um portal de energia estilo Doctor Strange atrás da pessoa: um anel giratório com arcos de faísca e brilho, posicionado no tronco. A pessoa permanece nítida na frente do portal. Escolha a cor (laranja, ciano, roxo ou verde) e o tamanho do anel.',
  category: 'scene',
  intensity: 'high',
  recommendedFor: ['vídeos virais', 'cosplay', 'aberturas épicas', 'fantasia'],
  visualBehavior: ['Portal giratório atrás da pessoa', 'Faíscas de energia', 'Brilho do anel'],
  parameters: {
    color: 'orange',
    size: 1,
  },
  previewStyle: {
    accent: '#ff8c1e',
    cardClass: 'border-orange-400/25 bg-orange-500/[0.07]',
    previewFilter: 'contrast(1.16) saturate(1.4) brightness(1.05)',
    overlayClass: 'bg-[radial-gradient(circle_at_50%_45%,rgba(255,140,30,0.25),transparent_55%)]',
  },
  badge: 'IA',
  isPremium: true,
  isAI: true,
  engine: true,
  needsPerson: true,
  requiredFeature: 'ai_auto_edit',
  controls: [
    {
      type: 'color',
      key: 'color',
      label: 'Cor do portal',
      options: [
        { value: 'orange', label: 'Laranja' },
        { value: 'cyan', label: 'Ciano' },
        { value: 'purple', label: 'Roxo' },
        { value: 'green', label: 'Verde' },
      ],
    },
    { type: 'slider', key: 'size', label: 'Tamanho', min: 0.5, max: 1.6, step: 0.1 },
  ],
};
