import { useMemo, useState } from 'react';
import { Music2, Sparkles, SlidersHorizontal } from 'lucide-react';
import { AutoMusicRecommendation } from './AutoMusicRecommendation';
import { MusicCard } from './MusicCard';
import { MusicFilters, DEFAULT_MUSIC_FILTERS, applyMusicFilters, type MusicFilterState } from './MusicFilters';
import { useMusicPreview } from '../hooks/useMusicPreview';
import { useRecommendedMusic } from '../hooks/useRecommendedMusic';
import { musicCategoryForTemplate } from '../categoryMap';
import type { MusicTrack, VideoDuration } from '../types';

interface MusicSelectorProps {
  tracks: MusicTrack[];
  loading?: boolean;
  duration: VideoDuration;
  templateCategory?: string | null;
  templateTags?: string[];
  templateIsPremium?: boolean;
  canUsePremium?: boolean;
  selectedTrackId?: string | null;
  previousMusicId?: string;
  onSelect: (track: MusicTrack | null) => void;
}

type Mode = 'auto' | 'manual';

function Skeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/[0.07]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.07]" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Seletor de música completo: modo automático + manual, filtros, prévia rápida,
 * badges (recomendado/premium/combina), estados de loading e vazio.
 */
export function MusicSelector(props: MusicSelectorProps) {
  const { tracks, loading, duration, templateCategory, templateTags, templateIsPremium, canUsePremium, selectedTrackId, previousMusicId, onSelect } = props;
  const [mode, setMode] = useState<Mode>('auto');
  const [filters, setFilters] = useState<MusicFilterState>(DEFAULT_MUSIC_FILTERS);
  const [shuffleIndex, setShuffleIndex] = useState(0);
  const preview = useMusicPreview();

  const { recommended, ranked } = useRecommendedMusic({
    tracks, templateCategory, duration, templateTags, templateIsPremium, userHasPremium: canUsePremium, previousMusicId,
  });

  const usableRanked = ranked.filter((r) => !(r.track.isPremium && !canUsePremium));
  const shuffled = usableRanked.length ? usableRanked[shuffleIndex % usableRanked.length] : recommended;

  const recommendedId = recommended?.track.id;
  const templateMusicCategory = musicCategoryForTemplate(templateCategory);

  const filtered = useMemo(() => {
    const list = applyMusicFilters(tracks, filters);
    // Mantém recomendadas/combináveis no topo.
    return [...list].sort((a, b) => {
      const aMatch = a.id === recommendedId ? 2 : a.category === templateMusicCategory ? 1 : 0;
      const bMatch = b.id === recommendedId ? 2 : b.category === templateMusicCategory ? 1 : 0;
      return bMatch - aMatch;
    });
  }, [tracks, filters, recommendedId, templateMusicCategory]);

  return (
    <div className="space-y-3">
      {/* Toggle modo */}
      <div className="flex rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1">
        <button
          type="button"
          onClick={() => setMode('auto')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition touch-manipulation ${
            mode === 'auto' ? 'bg-brand-500/22 text-brand-100' : 'text-white/55'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" /> Automático
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition touch-manipulation ${
            mode === 'manual' ? 'bg-brand-500/22 text-brand-100' : 'text-white/55'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Escolher
        </button>
      </div>

      {preview.error && (
        <p className="rounded-xl border border-amber-300/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-100/90">
          Não foi possível carregar a prévia agora. Tente outra música.
        </p>
      )}

      {loading ? (
        <Skeleton />
      ) : mode === 'auto' ? (
        <AutoMusicRecommendation
          recommendation={shuffled}
          preview={preview}
          duration={duration}
          onShuffle={usableRanked.length > 1 ? () => setShuffleIndex((i) => i + 1) : undefined}
          onApply={(track) => onSelect(track)}
        />
      ) : (
        <div className="space-y-3">
          <MusicFilters value={filters} onChange={setFilters} />
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-8 text-center">
              <Music2 className="h-6 w-6 text-white/30" />
              <p className="text-sm font-semibold text-white/65">Nenhuma música encontrada</p>
              <p className="text-[11px] text-white/40">Ajuste os filtros ou deixe o sistema escolher por você.</p>
            </div>
          ) : (
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-0.5">
              {filtered.map((track) => (
                <MusicCard
                  key={track.id}
                  track={track}
                  preview={preview}
                  duration={duration}
                  selected={selectedTrackId === track.id}
                  recommended={track.id === recommendedId}
                  matchesTemplate={track.category === templateMusicCategory}
                  canUsePremium={canUsePremium}
                  onSelect={(t) => onSelect(selectedTrackId === t.id ? null : t)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
