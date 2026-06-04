import { categoryProfile } from './categoryMap';
import type { MusicCategory, MusicTrack, RecommendationContext, RecommendationResult, VideoDuration } from './types';

/**
 * Pontua uma faixa para um contexto. Espelha a lógica pedida:
 *   +50 categoria igual
 *   +30 duração em bestForDurations
 *   +20 tags do template combinam
 *   +15 energia compatível
 *   +10 música premium para usuário premium
 * Faixas inativas ou premium sem direito são descartadas antes (ver recommendMusic).
 */
export function scoreTrack(track: MusicTrack, context: RecommendationContext): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (track.category === context.category) {
    score += 50;
    reasons.push('Mesma categoria da moldura');
  } else if (track.category === 'universal') {
    score += 12;
    reasons.push('Trilha universal compatível');
  }

  if (track.bestForDurations.includes(context.duration)) {
    score += 30;
    reasons.push(`Ideal para ${context.duration}s`);
  } else if (track.availableCuts.includes(context.duration)) {
    score += 10;
    reasons.push(`Tem corte de ${context.duration}s`);
  }

  const templateTags = (context.templateTags || []).map((t) => t.toLowerCase());
  if (templateTags.length) {
    const trackTags = track.tags.map((t) => t.toLowerCase());
    const overlap = trackTags.filter((t) => templateTags.includes(t)).length;
    if (overlap > 0) {
      score += Math.min(20, overlap * 8);
      reasons.push(`${overlap} tag(s) em comum`);
    }
  }

  const targetEnergy = context.energyLevel ?? categoryProfile(context.category).energyLevel;
  const energyGap = Math.abs((track.energyLevel || 5) - targetEnergy);
  if (energyGap <= 1) {
    score += 15;
    reasons.push('Energia compatível');
  } else if (energyGap <= 3) {
    score += 7;
    reasons.push('Energia próxima');
  }

  if (track.isPremium && context.userHasPremium) {
    score += 10;
    reasons.push('Faixa premium liberada');
  }

  if (context.previousMusicId && track.id === context.previousMusicId) {
    score += 5;
    reasons.push('Usada anteriormente');
  }

  return { score, reasons };
}

function isUsable(track: MusicTrack, context: RecommendationContext): boolean {
  if (!track.isActive) return false;
  // Música inativa nunca aparece; premium exige direito do usuário.
  if (track.isPremium && !context.userHasPremium) return false;
  return true;
}

/**
 * Ranqueia faixas usáveis para um contexto (maior score primeiro).
 * Não inclui fallback — use recommendMusic para a cadeia completa.
 */
export function rankTracks(tracks: MusicTrack[], context: RecommendationContext): RecommendationResult[] {
  return tracks
    .filter((track) => isUsable(track, context))
    .map((track) => {
      const { score, reasons } = scoreTrack(track, context);
      return { track, score, reasons, isFallback: false } satisfies RecommendationResult;
    })
    .sort((a, b) => b.score - a.score);
}

function pickByCategory(tracks: MusicTrack[], context: RecommendationContext, category: MusicCategory): RecommendationResult | null {
  const ranked = rankTracks(tracks, { ...context, category });
  return ranked.length ? ranked[0] : null;
}

function pickByDuration(tracks: MusicTrack[], context: RecommendationContext, duration: VideoDuration): RecommendationResult | null {
  const candidate = tracks.find(
    (track) => isUsable(track, context) && (track.bestForDurations.includes(duration) || track.availableCuts.includes(duration)),
  );
  if (!candidate) return null;
  const { score, reasons } = scoreTrack(candidate, context);
  return { track: candidate, score, reasons, isFallback: true };
}

/**
 * Recomendação automática completa com cadeia de fallback:
 *  1. Melhor faixa da categoria.
 *  2. Faixa universal de energia parecida.
 *  3. Qualquer faixa genérica da duração correta.
 *  4. null -> chamador avisa "sem música ideal" e aplica universal/aviso no admin.
 */
export function recommendMusic(tracks: MusicTrack[], context: RecommendationContext): RecommendationResult | null {
  const primary = pickByCategory(tracks, context, context.category);
  if (primary && primary.score >= 50) {
    // Se a melhor faixa não é da categoria pedida (ex.: universal), conta como fallback.
    return { ...primary, isFallback: primary.track.category !== context.category };
  }

  const universal = pickByCategory(tracks, context, 'universal');
  if (universal) {
    return { ...universal, isFallback: true, reasons: [...universal.reasons, 'Fallback universal'] };
  }

  // Se ainda assim houver algo da categoria (score baixo), use antes de desistir.
  if (primary) return { ...primary, isFallback: true };

  const byDuration = pickByDuration(tracks, context, context.duration);
  if (byDuration) return byDuration;

  return null;
}
