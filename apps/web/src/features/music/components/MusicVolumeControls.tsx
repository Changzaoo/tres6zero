import { Music2, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { FRIENDLY_LABELS, MIX_MODE_LABELS } from '../audioMix';
import type { AudioMixMode } from '../types';
import type { UseAudioMixSettings } from '../hooks/useAudioMixSettings';

const MODES: AudioMixMode[] = ['music_only', 'duck', 'balanced', 'original_focus'];

function pct(value: number) {
  return Math.round(value * 100);
}

/**
 * Controles de áudio do editor (mobile-first): volume da música, volume do som
 * original, mutar original, início/final suave. Termos populares, sem jargão.
 */
export function MusicVolumeControls({ mix }: { mix: UseAudioMixSettings }) {
  const { settings } = mix;
  const originalMuted = settings.originalVolume <= 0;

  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
      <div className="flex items-center gap-2">
        <Music2 className="h-4 w-4 text-brand-200" />
        <p className="text-xs font-semibold text-white/70">Áudio</p>
        <button
          type="button"
          onClick={mix.reset}
          className="ml-auto inline-flex h-7 items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] px-2 text-[10px] font-bold text-white/55 transition hover:bg-white/[0.08] hover:text-white"
        >
          <RotateCcw className="h-3 w-3" /> Padrão
        </button>
      </div>

      {/* Modos rápidos de mixagem */}
      <div className="grid grid-cols-2 gap-1.5">
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => mix.setMode(mode)}
            className={`min-h-[40px] rounded-xl border px-2 py-1.5 text-[11px] font-bold transition-colors touch-manipulation ${
              settings.mode === mode
                ? 'border-brand-300/45 bg-brand-500/18 text-brand-100'
                : 'border-white/[0.08] bg-white/[0.03] text-white/55 hover:bg-white/[0.06]'
            }`}
          >
            {MIX_MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      {/* Volume da música */}
      <label className="block space-y-1">
        <span className="flex items-center justify-between text-[11px] font-semibold text-white/55">
          <span className="flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5" /> {FRIENDLY_LABELS.musicVolume}</span>
          <span className="text-white/70">{pct(settings.musicVolume)}%</span>
        </span>
        <input
          type="range" min={0} max={100} value={pct(settings.musicVolume)}
          onChange={(e) => mix.setMusicVolume(Number(e.target.value) / 100)}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-brand-400 touch-manipulation"
        />
      </label>

      {/* Volume do som original */}
      <label className="block space-y-1">
        <span className="flex items-center justify-between text-[11px] font-semibold text-white/55">
          <span className="flex items-center gap-1.5">
            {originalMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {FRIENDLY_LABELS.originalVolume}
          </span>
          <button
            type="button"
            onClick={originalMuted ? () => mix.setOriginalVolume(0.2) : mix.muteOriginal}
            className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold text-white/60 hover:text-white"
          >
            {originalMuted ? 'Ativar' : 'Mutar'}
          </button>
        </span>
        <input
          type="range" min={0} max={100} value={pct(settings.originalVolume)}
          onChange={(e) => mix.setOriginalVolume(Number(e.target.value) / 100)}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-brand-400 touch-manipulation"
        />
      </label>

      {/* Fades */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-[11px] font-semibold text-white/55">
            <span>{FRIENDLY_LABELS.fadeIn}</span>
            <span className="text-white/70">{settings.fadeInSeconds.toFixed(1)}s</span>
          </span>
          <input
            type="range" min={0} max={30} value={Math.round(settings.fadeInSeconds * 10)}
            onChange={(e) => mix.setFadeIn(Number(e.target.value) / 10)}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-brand-400 touch-manipulation"
          />
        </label>
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-[11px] font-semibold text-white/55">
            <span>{FRIENDLY_LABELS.fadeOut}</span>
            <span className="text-white/70">{settings.fadeOutSeconds.toFixed(1)}s</span>
          </span>
          <input
            type="range" min={0} max={30} value={Math.round(settings.fadeOutSeconds * 10)}
            onChange={(e) => mix.setFadeOut(Number(e.target.value) / 10)}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-brand-400 touch-manipulation"
          />
        </label>
      </div>
    </div>
  );
}
