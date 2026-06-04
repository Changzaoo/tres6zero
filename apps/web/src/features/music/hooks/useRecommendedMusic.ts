import { useMemo } from 'react';
import { musicCategoryForTemplate } from '../categoryMap';
import { rankTracks, recommendMusic } from '../recommendation';
import type { MusicTrack, RecommendationResult, VideoDuration } from '../types';

export interface UseRecommendedMusicInput {
  tracks: MusicTrack[];
  templateCategory?: string | null;
  duration: VideoDuration;
  templateTags?: string[];
  templateIsPremium?: boolean;
  userHasPremium?: boolean;
  previousMusicId?: string;
}

/**
 * Calcula a sugestão automática e a lista ranqueada para a moldura + duração.
 * Memoizado para preview rápido no editor.
 */
export function useRecommendedMusic(input: UseRecommendedMusicInput): {
  recommended: RecommendationResult | null;
  ranked: RecommendationResult[];
} {
  const { tracks, templateCategory, duration, templateTags, templateIsPremium, userHasPremium, previousMusicId } = input;

  return useMemo(() => {
    const category = musicCategoryForTemplate(templateCategory);
    const context = { category, duration, templateTags, templateIsPremium, userHasPremium, previousMusicId };
    return {
      recommended: recommendMusic(tracks, context),
      ranked: rankTracks(tracks, context),
    };
  }, [tracks, templateCategory, duration, templateTags, templateIsPremium, userHasPremium, previousMusicId]);
}
