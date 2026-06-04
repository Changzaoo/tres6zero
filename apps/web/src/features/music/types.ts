/**
 * Durações finais suportadas pelo editor de vídeo (em segundos).
 * Espelha DURATION_OPTIONS do OperatorPage para manter compatibilidade.
 */
export type VideoDuration = 5 | 15 | 25 | 35 | 45;

export const VIDEO_DURATIONS: readonly VideoDuration[] = [5, 15, 25, 35, 45] as const;

/**
 * Categorias musicais. Cada categoria de moldura (TemplateCategory) é mapeada
 * para uma destas em categoryMap.ts. "universal" é o fallback global.
 */
export type MusicCategory =
  | 'aniversario'
  | 'casamento'
  | 'formatura'
  | 'corporativo'
  | 'balada_neon'
  | 'infantil'
  | 'boteco'
  | 'pool_party'
  | 'tropical'
  | 'romantico'
  | 'luxo'
  | 'gamer'
  | 'funk_festa'
  | 'retro'
  | 'natal'
  | 'ano_novo'
  | 'carnaval'
  | 'halloween'
  | 'minimalista'
  | 'cinematico'
  | 'esportivo'
  | 'universal';

export type MusicLicenseType =
  | 'royalty_free_or_owned'
  | 'public_domain'
  | 'creative_commons'
  | 'subscription_licensed'
  | 'ai_generated'
  | 'unknown';

export type MusicSource =
  | 'internal_library'
  | 'ai_generated'
  | 'licensed_import'
  | 'public_library';

/**
 * Modelo de dados rico de uma faixa musical. É um superset do AppMusic legado:
 * faixas antigas continuam válidas; campos novos são opcionais para migração
 * incremental (ver fromAppMusic em adapters quando implementado na Etapa 4).
 */
export interface MusicTrack {
  id: string;
  title: string;
  slug: string;
  category: MusicCategory;
  subcategory?: string;
  mood: string[];
  /** Energia visual/musical de 1 (calmo) a 10 (intenso). */
  energyLevel: number;
  bpm?: number;
  /** Duração do arquivo original, em segundos. */
  durationOriginal: number;
  /** Cortes que existem/podem existir para esta faixa. */
  availableCuts: VideoDuration[];
  /** Durações para as quais esta faixa funciona melhor. */
  bestForDurations: VideoDuration[];
  fileUrl: string;
  previewUrl?: string;
  /** URLs de cortes prontos por duração (Supabase /music/cuts/...). */
  cuts?: Partial<Record<VideoDuration, string>>;
  waveformUrl?: string;
  licenseType: MusicLicenseType;
  licenseDocumentUrl?: string;
  source: MusicSource;
  allowedCommercialUse: boolean;
  attributionRequired: boolean;
  attributionText?: string;
  tags: string[];
  isPremium: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Como o áudio original do vídeo se relaciona com a trilha escolhida.
 * - music_only: muta o áudio original.
 * - duck: mantém o áudio original baixo sob a música.
 * - balanced: mistura equilibrada.
 * - original_focus: prioriza o áudio original, música ao fundo.
 */
export type AudioMixMode = 'music_only' | 'duck' | 'balanced' | 'original_focus';

export interface AudioMixSettings {
  /** Volume da trilha musical (0..1). */
  musicVolume: number;
  /** Volume do áudio original do vídeo (0..1). */
  originalVolume: number;
  /** Atalho que pré-configura os volumes. */
  mode: AudioMixMode;
  /** Fade-in da música, em segundos. */
  fadeInSeconds: number;
  /** Fade-out da música, em segundos. */
  fadeOutSeconds: number;
  /** Normaliza volume e evita clipping na exportação. */
  normalize: boolean;
}

/**
 * Plano de reprodução/corte da música para uma duração-alvo do vídeo.
 * Resultado puro e testável, consumido pelo renderer na Etapa 2.
 */
export interface MusicClipPlan {
  /** Início do trecho dentro do arquivo original (s). */
  sourceStart: number;
  /** Fim do trecho dentro do arquivo original (s). */
  sourceEnd: number;
  /** Duração efetiva que será reproduzida (= duração do vídeo). */
  playDuration: number;
  /** Se a faixa é menor que o vídeo e precisa de loop suave. */
  loop: boolean;
  fadeInSeconds: number;
  fadeOutSeconds: number;
}

export interface RecommendationContext {
  category: MusicCategory;
  duration: VideoDuration;
  /** Energia desejada do template (1..10), se conhecida. */
  energyLevel?: number;
  /** Tags do template selecionado. */
  templateTags?: string[];
  /** O template é premium? (libera faixas premium para planos premium) */
  templateIsPremium?: boolean;
  /** O usuário tem direito a conteúdo premium? */
  userHasPremium?: boolean;
  /** Música usada anteriormente pelo usuário (leve preferência). */
  previousMusicId?: string;
}

export interface RecommendationResult {
  track: MusicTrack;
  score: number;
  /** Por que foi escolhida (debug/admin). */
  reasons: string[];
  /** true quando caiu em fallback universal/genérico. */
  isFallback: boolean;
}
