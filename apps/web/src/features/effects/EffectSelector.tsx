import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EffectPreviewCard } from './EffectPreviewCard';
import { getVideoEffect, videoEffects } from './effects.config';
import type { VideoEffectConfig } from './effects.types';

type EffectSelectorProps = {
  value: string;
  onChange: (effectId: string) => void;
  isEffectLocked?: (effect: VideoEffectConfig) => boolean;
  onApply?: (effect: VideoEffectConfig) => void;
  className?: string;
  compact?: boolean;
};

function formatParameterValue(value: VideoEffectConfig['parameters'][string]) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'ativo' : 'desativado';
  return String(value);
}

export function EffectSelector({
  value,
  onChange,
  isEffectLocked,
  onApply,
  className = '',
  compact = false,
}: EffectSelectorProps) {
  const selectedEffect = useMemo(() => getVideoEffect(value) || videoEffects[0], [value]);
  const locked = isEffectLocked?.(selectedEffect) || false;

  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Efeito</p>
          <p className="text-xs leading-relaxed text-white/38">Escolha o acabamento visual do video.</p>
        </div>
        {selectedEffect.isAI && (
          <span className="rounded-full border border-brand-300/25 bg-brand-500/14 px-3 py-1 text-[11px] font-bold text-brand-100">
            IA
          </span>
        )}
      </div>

      <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
        {videoEffects.map((effect) => (
          <EffectPreviewCard
            key={effect.id}
            effect={effect}
            selected={selectedEffect.id === effect.id}
            locked={isEffectLocked?.(effect)}
            onSelect={() => onChange(effect.id)}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-black/18 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-300" />
              <h3 className="text-sm font-bold text-white">{selectedEffect.name}</h3>
              {selectedEffect.badge && (
                <span className="rounded-full bg-white/[0.07] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/48">
                  {selectedEffect.badge}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-white/52">{selectedEffect.longDescription}</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedEffect.visualBehavior.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-semibold text-white/44">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <Button
            size="sm"
            disabled={locked}
            onClick={() => onApply?.(selectedEffect)}
            icon={<Sparkles className="h-4 w-4" />}
            className="shrink-0 justify-center"
          >
            Aplicar efeito
          </Button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(selectedEffect.parameters).map(([key, parameterValue]) => (
            <div key={key} className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/28">{key}</p>
              <p className="mt-1 truncate text-xs font-semibold text-white/62">{formatParameterValue(parameterValue)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
