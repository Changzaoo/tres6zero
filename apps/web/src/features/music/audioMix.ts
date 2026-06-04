import type { AudioMixMode, AudioMixSettings, MusicClipPlan, MusicTrack, VideoDuration } from './types';

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Presets de volume por modo de mixagem (música, áudio original). */
export const MIX_MODE_PRESETS: Record<AudioMixMode, { musicVolume: number; originalVolume: number }> = {
  music_only: { musicVolume: 0.9, originalVolume: 0 },
  duck: { musicVolume: 0.85, originalVolume: 0.2 },
  balanced: { musicVolume: 0.6, originalVolume: 0.6 },
  original_focus: { musicVolume: 0.3, originalVolume: 0.95 },
};

/**
 * Default = só a música (preserva o comportamento atual do app, que descarta
 * o áudio original). O usuário ativa o som original pelos controles do editor.
 */
export const DEFAULT_MIX_SETTINGS: AudioMixSettings = {
  ...MIX_MODE_PRESETS.music_only,
  mode: 'music_only',
  fadeInSeconds: 0.3,
  fadeOutSeconds: 0.6,
  normalize: true,
};

/** Aplica um modo de mixagem mantendo fades/normalize do usuário. */
export function applyMixMode(settings: AudioMixSettings, mode: AudioMixMode): AudioMixSettings {
  return { ...settings, mode, ...MIX_MODE_PRESETS[mode] };
}

/**
 * Fades recomendados por duração final. Vídeos de 5s têm impacto imediato
 * (fade-in mínimo / nenhum); vídeos longos podem respirar mais.
 */
export function recommendedFades(duration: VideoDuration): { fadeInSeconds: number; fadeOutSeconds: number } {
  switch (duration) {
    case 5:
      return { fadeInSeconds: 0, fadeOutSeconds: 0.4 };
    case 15:
      return { fadeInSeconds: 0.2, fadeOutSeconds: 0.6 };
    case 25:
      return { fadeInSeconds: 0.4, fadeOutSeconds: 0.8 };
    case 35:
      return { fadeInSeconds: 0.6, fadeOutSeconds: 1.0 };
    case 45:
    default:
      return { fadeInSeconds: 0.8, fadeOutSeconds: 1.2 };
  }
}

/**
 * Decide o melhor ponto de início do trecho dentro do arquivo original.
 * Sem detecção de batida disponível no cliente, usamos heurísticas:
 * - 5s/15s: priorizar o "miolo" energético (drop/refrão costuma estar após o 1/4).
 * - 25s+: começar mais cedo para ter introdução natural.
 * O ponto preferido informado (preferredStart) sempre tem prioridade.
 */
function defaultSourceStart(durationOriginal: number, target: VideoDuration, preferredStart?: number): number {
  const safeOriginal = Math.max(0, durationOriginal || 0);
  if (typeof preferredStart === 'number' && preferredStart >= 0) {
    return Math.min(preferredStart, Math.max(0, safeOriginal - target));
  }
  if (safeOriginal <= target) return 0;

  const slack = safeOriginal - target;
  // Para cortes curtos, pular a introdução e pegar a parte mais marcante.
  const ratio = target <= 15 ? 0.28 : 0.08;
  return Math.min(slack, safeOriginal * ratio);
}

/**
 * Plano puro de corte/reprodução: garante que a música NUNCA fique maior
 * que o vídeo e cria loop suave quando a faixa for menor.
 */
export function planMusicClip(params: {
  durationOriginal: number;
  targetDuration: VideoDuration;
  preferredStart?: number;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
}): MusicClipPlan {
  const { durationOriginal, targetDuration } = params;
  const fades = recommendedFades(targetDuration);
  const fadeInSeconds = Math.max(0, params.fadeInSeconds ?? fades.fadeInSeconds);
  // fade-out nunca pode passar de metade do vídeo
  const fadeOutSeconds = Math.min(
    targetDuration / 2,
    Math.max(0, params.fadeOutSeconds ?? fades.fadeOutSeconds),
  );

  const safeOriginal = Math.max(0, durationOriginal || 0);

  if (safeOriginal <= targetDuration) {
    // Faixa menor que o vídeo -> loop suave do início ao fim disponível.
    return {
      sourceStart: 0,
      sourceEnd: safeOriginal || targetDuration,
      playDuration: targetDuration,
      loop: safeOriginal > 0 && safeOriginal < targetDuration,
      fadeInSeconds,
      fadeOutSeconds,
    };
  }

  const sourceStart = defaultSourceStart(safeOriginal, targetDuration, params.preferredStart);
  const sourceEnd = Math.min(safeOriginal, sourceStart + targetDuration);
  return {
    sourceStart,
    sourceEnd,
    playDuration: targetDuration,
    loop: false,
    fadeInSeconds,
    fadeOutSeconds,
  };
}

/**
 * Ganho da música em um instante `t` (0..playDuration), aplicando fade-in/out.
 * Função pura para o renderer agendar `gain.gain` ou para testes.
 */
export function musicGainAt(t: number, plan: MusicClipPlan, baseVolume: number): number {
  const vol = clamp01(baseVolume);
  if (t <= 0) return plan.fadeInSeconds > 0 ? 0 : vol;
  if (t >= plan.playDuration) return plan.fadeOutSeconds > 0 ? 0 : vol;

  let gain = vol;
  if (plan.fadeInSeconds > 0 && t < plan.fadeInSeconds) {
    gain = vol * (t / plan.fadeInSeconds);
  }
  const fadeOutStart = plan.playDuration - plan.fadeOutSeconds;
  if (plan.fadeOutSeconds > 0 && t > fadeOutStart) {
    const remaining = (plan.playDuration - t) / plan.fadeOutSeconds;
    gain = Math.min(gain, vol * remaining);
  }
  return clamp01(gain);
}

/**
 * Fator de normalização simples para evitar clipping quando música + áudio
 * original somam mais que 1.0. Mantém a proporção entre as duas fontes.
 */
export function normalizationFactor(musicVolume: number, originalVolume: number): number {
  const sum = clamp01(musicVolume) + clamp01(originalVolume);
  return sum > 1 ? 1 / sum : 1;
}

/** Verdadeiro se a faixa pode cobrir a duração (sozinha ou com loop). */
export function trackCoversDuration(track: Pick<MusicTrack, 'durationOriginal'>, duration: VideoDuration): boolean {
  return (track.durationOriginal || 0) > 0; // loop suave cobre faixas curtas
}

/* -------------------------------------------------------------------------- */
/*  Rótulos populares — nunca mostrar termos técnicos ao usuário final.       */
/* -------------------------------------------------------------------------- */

export const FRIENDLY_LABELS = {
  energyLevel: 'Energia',
  bpm: 'Ritmo',
  fadeIn: 'Início suave',
  fadeOut: 'Final suave',
  musicVolume: 'Volume da música',
  originalVolume: 'Som original do vídeo',
  normalize: 'Equilibrar volume',
} as const;

export const MIX_MODE_LABELS: Record<AudioMixMode, string> = {
  music_only: 'Só a música',
  duck: 'Música em destaque',
  balanced: 'Mix equilibrado',
  original_focus: 'Som original em destaque',
};

/** Converte energia 1..10 em rótulo amigável. */
export function energyLabel(level: number): string {
  if (level <= 3) return 'Calma';
  if (level <= 6) return 'Moderada';
  if (level <= 8) return 'Animada';
  return 'Intensa';
}
