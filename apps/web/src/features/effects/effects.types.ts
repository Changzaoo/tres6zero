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
  | 'ai_auto'
  // --- Motor de efeitos criativos (engine) ---
  // Aura/energia na pessoa
  | 'aura_energy'
  | 'rim_neon'
  // Movimento e clones
  | 'speed_clones'
  | 'ghost_echo'
  | 'light_trails'
  | 'freeze_background'
  // Fundo e cenário
  | 'background_focus'
  | 'background_replace'
  | 'particle_dissolve'
  | 'portal'
  // Ambiente e câmera
  | 'ambient_particles'
  | 'light_leaks'
  | 'god_rays'
  | 'glitch_vhs'
  | 'beat_pulse';

export type VideoEffectCategory =
  | 'basic'
  | 'motion'
  | 'premium'
  | 'party'
  | 'corporate'
  | 'ai'
  | 'aura'
  | 'fx_motion'
  | 'scene'
  | 'ambient';
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

/**
 * Controle fino exibido na sidebar quando o efeito está selecionado. Dirige a
 * UI genérica de `EffectControls` e grava em `parameters` do efeito.
 */
export type VideoEffectControl =
  | { type: 'slider'; key: string; label: string; min: number; max: number; step?: number; unit?: string }
  | { type: 'select'; key: string; label: string; options: readonly { value: string; label: string }[] }
  | { type: 'color'; key: string; label: string; options?: readonly { value: string; label: string }[] };

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
  badge?: 'Padrão' | 'Popular' | 'Filme' | 'Premium' | 'IA' | 'Recomendado' | 'Novo' | '3D';
  isPremium?: boolean;
  isAI?: boolean;
  requiredFeature: VideoEffectFeature;
  /** Efeito processado pelo motor criativo (engine/) no render do navegador. */
  engine?: boolean;
  /** Precisa de segmentação de pessoa (MediaPipe) para o resultado completo. */
  needsPerson?: boolean;
  /** Controles finos exibidos quando o efeito está selecionado. */
  controls?: readonly VideoEffectControl[];
};

export type ApplyEffectPayload = {
  videoId: string;
  effectId: VideoEffectId;
  effectName: string;
  parameters: VideoEffectParameters;
  exportFormat: VideoExportFormat;
  finalDuration?: number;
};
