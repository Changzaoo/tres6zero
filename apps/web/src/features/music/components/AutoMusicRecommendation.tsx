import { RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { MusicPreviewButton } from './MusicPreviewButton';
import { categoryProfile } from '../categoryMap';
import { energyLabel } from '../audioMix';
import type { UseMusicPreview } from '../hooks/useMusicPreview';
import type { MusicTrack, RecommendationResult, VideoDuration } from '../types';

interface AutoMusicRecommendationProps {
  recommendation: RecommendationResult | null;
  preview: UseMusicPreview;
  duration: VideoDuration;
  /** Próxima sugestão (botão "trocar"). */
  onShuffle?: () => void;
  onApply: (track: MusicTrack) => void;
}

/**
 * Bloco "Escolher música automaticamente": mostra a sugestão, prévia, trocar e aplicar.
 */
export function AutoMusicRecommendation({ recommendation, preview, duration, onShuffle, onApply }: AutoMusicRecommendationProps) {
  if (!recommendation) {
    return (
      <div className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.06] p-3 text-xs text-amber-100/90">
        Não encontramos uma música ideal para esta moldura. Vamos aplicar uma opção universal.
      </div>
    );
  }

  const { track, isFallback } = recommendation;
  const profile = categoryProfile(track.category);

  return (
    <div className="space-y-2.5 rounded-2xl border border-brand-300/25 bg-brand-500/[0.08] p-3">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-brand-200" />
        <p className="text-xs font-semibold text-brand-100">Sugestão automática</p>
        {onShuffle && (
          <button
            type="button"
            onClick={onShuffle}
            className="ml-auto inline-flex h-8 items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-2.5 text-[11px] font-bold text-white/70 transition hover:bg-white/[0.1] hover:text-white touch-manipulation"
          >
            <RefreshCw className="h-3 w-3" /> Trocar
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <MusicPreviewButton track={track} preview={preview} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white/90">{track.title}</p>
          <p className="truncate text-[11px] text-white/50">
            {profile.label} · {energyLabel(track.energyLevel)} · ideal para {duration}s
          </p>
        </div>
        <button
          type="button"
          onClick={() => onApply(track)}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-500/90 px-3.5 text-xs font-bold text-white transition hover:bg-brand-500 touch-manipulation"
        >
          <Sparkles className="h-3.5 w-3.5" /> Aplicar
        </button>
      </div>

      {isFallback && (
        <p className="text-[11px] text-amber-100/80">Aplicamos uma música universal que combina com seu vídeo.</p>
      )}
    </div>
  );
}
