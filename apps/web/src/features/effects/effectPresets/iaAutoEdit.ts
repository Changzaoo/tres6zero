import type { VideoEffectConfig } from '../effects.types';

export const iaAutoEditEffect: VideoEffectConfig = {
  id: 'ai_auto',
  name: 'IA auto edit',
  shortDescription: 'Escolha automática de efeito, clima e trilha.',
  longDescription: 'Analisa contexto, template, duração e tipo do evento para escolher o acabamento ideal no navegador.',
  category: 'ai',
  intensity: 'auto',
  recommendedFor: ['entregas rapidas', 'operação sem editor', 'vídeos prontos para postar'],
  visualBehavior: [
    'Detecta cena e contexto',
    'Escolhe efeito e trilha',
    'Ajusta duração e estilo automaticamente',
  ],
  parameters: {
    autoDetectScene: true,
    autoTrim: true,
    autoMusicSync: true,
    autoTemplateMatch: true,
    autoCaptions: 'optional',
    autoExportFormat: ['9:16', '1:1', '16:9'],
    confidenceScore: true,
  },
  previewStyle: {
    accent: '#8b5cf6',
    cardClass: 'border-brand-300/30 bg-brand-500/[0.12]',
    previewFilter: 'contrast(1.1) saturate(1.12)',
    overlayClass: 'bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(139,92,246,0.18),rgba(255,255,255,0.04))] mix-blend-screen',
  },
  badge: 'IA',
  isPremium: true,
  isAI: true,
  requiredFeature: 'ai_auto_edit',
};
