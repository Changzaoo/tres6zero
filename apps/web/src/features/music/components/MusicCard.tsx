import { Check, Crown, Sparkles } from 'lucide-react';
import { categoryProfile } from '../categoryMap';
import { energyLabel } from '../audioMix';
import { MusicPreviewButton } from './MusicPreviewButton';
import type { UseMusicPreview } from '../hooks/useMusicPreview';
import type { MusicTrack, VideoDuration } from '../types';

interface MusicCardProps {
  track: MusicTrack;
  preview: UseMusicPreview;
  duration: VideoDuration;
  selected?: boolean;
  recommended?: boolean;
  matchesTemplate?: boolean;
  /** O usuário pode usar faixas premium? */
  canUsePremium?: boolean;
  onSelect: (track: MusicTrack) => void;
}

/**
 * Card grande mobile-first com badges (recomendado / premium / combina) e prévia.
 */
export function MusicCard({ track, preview, duration, selected, recommended, matchesTemplate, canUsePremium = false, onSelect }: MusicCardProps) {
  const locked = track.isPremium && !canUsePremium;
  const profile = categoryProfile(track.category);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
        selected
          ? 'border-brand-300/55 bg-brand-500/12 ring-1 ring-brand-500/20'
          : 'border-white/[0.08] bg-white/[0.035] hover:border-white/[0.16] hover:bg-white/[0.06]'
      }`}
    >
      <MusicPreviewButton track={track} preview={preview} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-white/90">{track.title}</p>
          {track.isPremium && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-300" />}
        </div>
        <p className="truncate text-[11px] text-white/45">
          {profile.label} · {energyLabel(track.energyLevel)}
          {track.bpm ? ` · ${track.bpm} BPM` : ''}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {recommended && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-300/30 bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-brand-100">
              <Sparkles className="h-2.5 w-2.5" /> Recomendado
            </span>
          )}
          {matchesTemplate && !recommended && (
            <span className="rounded-full border border-emerald-300/25 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
              Combina com a moldura
            </span>
          )}
          {track.bestForDurations.includes(duration) && (
            <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] font-bold text-white/55">
              Ideal {duration}s
            </span>
          )}
          {locked && (
            <span className="rounded-full border border-amber-300/25 bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold text-amber-100">
              Premium
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={locked}
        onClick={() => onSelect(track)}
        className={`flex h-10 min-w-[44px] items-center justify-center rounded-xl px-3 text-xs font-bold transition touch-manipulation ${
          selected
            ? 'bg-brand-500/30 text-brand-100'
            : 'border border-white/12 bg-white/[0.06] text-white/75 hover:bg-white/[0.1]'
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {selected ? <Check className="h-4 w-4" /> : 'Usar'}
      </button>
    </div>
  );
}
