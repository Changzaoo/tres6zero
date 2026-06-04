import { Loader2, Pause, Play } from 'lucide-react';
import type { UseMusicPreview } from '../hooks/useMusicPreview';
import type { MusicTrack } from '../types';

/**
 * Botão de prévia rápido. Reaproveita um player único (useMusicPreview).
 */
export function MusicPreviewButton({ track, preview }: { track: MusicTrack; preview: UseMusicPreview }) {
  const isPlaying = preview.playingId === track.id;
  const isLoading = preview.loadingId === track.id;
  const url = track.previewUrl || track.fileUrl;

  return (
    <button
      type="button"
      aria-label={isPlaying ? `Pausar ${track.title}` : `Ouvir ${track.title}`}
      disabled={!url}
      onClick={() => preview.toggle(track.id, url)}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition touch-manipulation ${
        isPlaying
          ? 'border-brand-300/50 bg-brand-500/25 text-brand-100'
          : 'border-white/12 bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
    </button>
  );
}
