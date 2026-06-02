export type VideoEffectId =
  | 'clean'
  | 'slow_motion'
  | 'boomerang'
  | 'speed_ramp'
  | 'cinematic'
  | 'neon'
  | 'party'
  | 'luxury'
  | 'glitch_flash'
  | 'wedding_soft'
  | 'corporate_sharp'
  | 'ai_auto';

export type VideoEffectCategory = 'basic' | 'motion' | 'premium' | 'party' | 'corporate' | 'ai';
export type VideoEffectIntensity = 'low' | 'medium' | 'high' | 'auto';
export type VideoExportFormat = '9:16' | '1:1' | '16:9';
export type VideoEffectFeature = 'basic_effects' | 'popular_effects' | 'ai_auto_edit';

export type VideoEffectParameters = Record<string, number | string | boolean | readonly string[]>;

export type VideoEffectPreviewStyle = {
  accent: string;
  cardClass: string;
  previewFilter: string;
  overlayClass?: string;
};

export type VideoEffectConfig = {
  id: VideoEffectId;
  name: string;
  shortDescription: string;
  longDescription: string;
  category: VideoEffectCategory;
  intensity: VideoEffectIntensity;
  recommendedFor: readonly string[];
  visualBehavior: readonly string[];
  parameters: VideoEffectParameters;
  previewStyle: VideoEffectPreviewStyle;
  badge?: 'Padrao' | 'Popular' | 'Filme' | 'Premium' | 'IA' | 'Recomendado';
  isPremium?: boolean;
  isAI?: boolean;
  requiredFeature: VideoEffectFeature;
};

export type ApplyEffectPayload = {
  videoId: string;
  effectId: VideoEffectId;
  effectName: string;
  parameters: VideoEffectParameters;
  exportFormat: VideoExportFormat;
  finalDuration?: number;
};
