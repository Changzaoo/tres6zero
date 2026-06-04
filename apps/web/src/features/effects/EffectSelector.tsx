import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Lock, Sparkles, Wand2, Zap } from 'lucide-react';
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
  /** Hides the section header and detail panel — use inside compact sidebars */
  minimal?: boolean;
};

const categoryIcon = {
  basic: Sparkles,
  motion: Zap,
  premium: Wand2,
  party: Zap,
  corporate: Sparkles,
  ai: Wand2,
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
  minimal = false,
}: EffectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedEffect = useMemo(() => getVideoEffect(value) || videoEffects[0], [value]);
  const hoveredEffect = hoveredId ? getVideoEffect(hoveredId) : null;
  const previewEffect = hoveredEffect || selectedEffect;
  const showPreviewPanel = !compact && !minimal;
  const locked = isEffectLocked?.(selectedEffect) || false;
  const SelectedIcon = categoryIcon[selectedEffect.category];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(effect: VideoEffectConfig) {
    if (isEffectLocked?.(effect)) return;
    onChange(effect.id);
    setIsOpen(false);
  }

  return (
    <section className={`${minimal ? '' : 'space-y-3'} ${className}`}>
      {!minimal && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Efeito</p>
            <p className="text-xs leading-relaxed text-white/38">Escolha o acabamento visual do vídeo.</p>
          </div>
          {selectedEffect.isAI && (
            <span className="rounded-full border border-brand-300/25 bg-brand-500/14 px-3 py-1 text-[11px] font-bold text-brand-100">
              IA
            </span>
          )}
        </div>
      )}

      {/* Dropdown */}
      <div ref={containerRef} className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.99] ${
            isOpen
              ? 'border-brand-300/50 bg-brand-500/14 ring-2 ring-brand-500/18'
              : 'border-white/[0.09] bg-white/[0.045] hover:border-white/[0.18] hover:bg-white/[0.065]'
          }`}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/22"
            style={{ color: selectedEffect.previewStyle.accent }}
          >
            <SelectedIcon className="h-4 w-4" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight text-white">{selectedEffect.name}</p>
            <p className="mt-0.5 truncate text-xs text-white/62">{selectedEffect.shortDescription}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {selectedEffect.badge && (
              <span className="hidden rounded-full border border-white/10 bg-white/[0.07] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/50 sm:inline">
                {selectedEffect.badge}
              </span>
            )}
            {locked && <Lock className="h-4 w-4 text-white/38" />}
            <ChevronDown
              className={`h-4 w-4 text-white/42 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* Dropdown panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-white/[0.12]"
              style={{
                background: 'rgba(9, 12, 18, 0.99)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="flex">
                {/* Effect list */}
                <div
                  className="min-w-0 flex-1 overflow-y-auto py-1.5"
                  style={{ maxHeight: compact || minimal ? '320px' : '360px' }}
                >
                  {videoEffects.map((effect) => {
                    const Icon = categoryIcon[effect.category];
                    const isSelected = selectedEffect.id === effect.id;
                    const isHovered = hoveredId === effect.id;
                    const isLocked = isEffectLocked?.(effect);

                    return (
                      <button
                        key={effect.id}
                        type="button"
                        onClick={() => handleSelect(effect)}
                        onMouseEnter={() => setHoveredId(effect.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onFocus={() => setHoveredId(effect.id)}
                        className={`flex min-h-[52px] w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                          isHovered
                            ? 'bg-white/[0.09]'
                            : isSelected
                            ? 'bg-brand-500/[0.14]'
                            : ''
                        } ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25"
                          style={{ color: effect.previewStyle.accent }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-semibold leading-tight ${
                              isSelected ? 'text-brand-200' : 'text-white'
                            }`}
                          >
                            {effect.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-white/58">
                            {effect.shortDescription}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {effect.badge && (
                            <span className="hidden rounded-full border border-white/[0.08] bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/40 sm:inline">
                              {effect.badge}
                            </span>
                          )}
                          {isLocked ? (
                            <Lock className="h-3.5 w-3.5 text-white/30" />
                          ) : isSelected ? (
                            <Check className="h-3.5 w-3.5 text-brand-300" />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Hover preview panel — desktop only */}
                {showPreviewPanel && (
                  <div className="hidden border-l border-white/[0.06] lg:block">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={previewEffect.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                        className="w-60"
                      >
                        <EffectPreviewCard effect={previewEffect} />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected effect detail panel — hidden in minimal mode */}
      {!minimal && (
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
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-semibold text-white/44"
                  >
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

          {!compact && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(selectedEffect.parameters).map(([key, parameterValue]) => (
                <div
                  key={key}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/28">{key}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-white/62">
                    {formatParameterValue(parameterValue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
