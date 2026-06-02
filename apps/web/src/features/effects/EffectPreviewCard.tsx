import { Check, Lock, Sparkles, Wand2, Zap } from 'lucide-react';
import type { VideoEffectConfig } from './effects.types';

const iconByCategory = {
  basic: Sparkles,
  motion: Zap,
  premium: Wand2,
  party: Zap,
  corporate: Sparkles,
  ai: Wand2,
};

type EffectPreviewCardProps = {
  effect: VideoEffectConfig;
  selected: boolean;
  locked?: boolean;
  onSelect: () => void;
};

export function EffectPreviewCard({ effect, selected, locked = false, onSelect }: EffectPreviewCardProps) {
  const Icon = iconByCategory[effect.category];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative min-h-[154px] overflow-hidden rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
        selected
          ? 'border-brand-300/65 bg-brand-500/16 shadow-glow'
          : `${effect.previewStyle.cardClass} hover:border-brand-300/35 hover:bg-white/[0.07]`
      } ${locked ? 'opacity-72' : ''}`}
      aria-pressed={selected}
    >
      {effect.previewStyle.overlayClass && (
        <div className={`absolute inset-0 opacity-70 transition-opacity group-hover:opacity-100 ${effect.previewStyle.overlayClass}`} />
      )}
      <div className="relative z-10 flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/22"
            style={{ color: effect.previewStyle.accent }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="flex items-center gap-1.5">
            {effect.badge && (
              <span className="rounded-full border border-white/10 bg-white/[0.07] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/62">
                {effect.badge}
              </span>
            )}
            {locked ? (
              <Lock className="h-4 w-4 text-white/38" />
            ) : selected ? (
              <Check className="h-4 w-4 text-brand-200" />
            ) : null}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white">{effect.name}</h3>
          <p className="line-clamp-2 text-xs leading-relaxed text-white/48">{effect.shortDescription}</p>
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5">
          {effect.recommendedFor.slice(0, 2).map((item) => (
            <span key={item} className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-white/42">
              {item}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
