import { Sparkles, Wand2, Zap } from 'lucide-react';
import type { VideoEffectConfig } from './effects.types';

const categoryIcon = {
  basic: Sparkles,
  motion: Zap,
  premium: Wand2,
  party: Zap,
  corporate: Sparkles,
  ai: Wand2,
};

function formatParam(value: VideoEffectConfig['parameters'][string]): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'ativo' : 'desativado';
  return String(value);
}

type EffectPreviewCardProps = {
  effect: VideoEffectConfig;
};

export function EffectPreviewCard({ effect }: EffectPreviewCardProps) {
  const Icon = categoryIcon[effect.category];
  const topParams = Object.entries(effect.parameters).slice(0, 6);

  return (
    <div className="space-y-3 p-4">
      {/* Visual mock with CSS filter preview */}
      <div
        className="relative h-24 w-full overflow-hidden rounded-xl"
        style={{ filter: effect.previewStyle.previewFilter }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#171923_0%,#0b0d13_42%,#17101f_100%)]" />
        <div className="absolute inset-x-5 bottom-4 h-11 rounded-t-[44px] border border-white/10 bg-white/[0.055]" />
        <div className="absolute left-[30%] top-[20%] h-9 w-9 rounded-full border border-white/10 bg-white/[0.08]" />
        <div className="absolute right-[22%] top-[28%] h-6 w-6 rounded-full border border-white/[0.07] bg-white/[0.06]" />
        {effect.previewStyle.overlayClass && (
          <div className={`absolute inset-0 ${effect.previewStyle.overlayClass}`} />
        )}
      </div>

      {/* Effect identity */}
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/22"
          style={{ color: effect.previewStyle.accent }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-none text-white">{effect.name}</p>
          {effect.badge && (
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
              {effect.badge}
            </p>
          )}
        </div>
        {effect.isAI && (
          <span className="rounded-full border border-brand-300/25 bg-brand-500/14 px-2 py-0.5 text-[10px] font-bold text-brand-100">
            IA
          </span>
        )}
        {effect.isPremium && !effect.isAI && (
          <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-200/70">
            PRO
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-white/50">{effect.shortDescription}</p>

      {/* Behavior chips */}
      <div className="flex flex-wrap gap-1">
        {effect.visualBehavior.slice(0, 3).map((b) => (
          <span
            key={b}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-white/40"
          >
            {b}
          </span>
        ))}
      </div>

      {/* Key parameters */}
      <div className="grid grid-cols-2 gap-1.5">
        {topParams.map(([k, v]) => (
          <div key={k} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/28">{k}</p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-white/52">{formatParam(v)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
