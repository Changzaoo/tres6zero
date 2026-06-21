import { Sliders } from 'lucide-react';
import type { VideoEffectConfig } from './effects.types';

export type EffectParamValue = number | string | boolean;
export type EffectParams = Record<string, EffectParamValue>;

type EffectControlsProps = {
  effect: VideoEffectConfig;
  params: EffectParams;
  intensity: number;
  onParamChange: (key: string, value: EffectParamValue) => void;
  onIntensityChange: (value: number) => void;
  className?: string;
};

const COLOR_SWATCHES: Record<string, string> = {
  gold: '#ffd140',
  amber: '#ffb020',
  blue: '#40a8ff',
  cyan: '#38e6f0',
  red: '#ff4848',
  crimson: '#dc2640',
  purple: '#a85cff',
  violet: '#8b5cf6',
  pink: '#ec4899',
  green: '#40e680',
  white: '#ffffff',
  orange: '#ff7a24',
  teal: '#2dd4bf',
  warm: '#ffa94d',
  ember: '#ff7828',
  ash: '#9e9eaa',
  yellow: '#ffe040',
  rainbow: 'linear-gradient(90deg,#ff4848,#ffd140,#40e680,#40a8ff,#a85cff)',
};

function paramAsNumber(value: EffectParamValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function paramAsString(value: EffectParamValue | undefined, fallback: string) {
  return typeof value === 'string' && value ? value : fallback;
}

/**
 * Painel de controles finos do efeito selecionado. É genérico: lê `effect.controls`
 * e renderiza sliders/selects/cores que gravam em `params` (e na intensidade
 * mestre). Só aparece para efeitos do motor (`engine`) com algum controle.
 */
export function EffectControls({
  effect,
  params,
  intensity,
  onParamChange,
  onIntensityChange,
  className = '',
}: EffectControlsProps) {
  if (!effect.engine) return null;
  const controls = effect.controls || [];

  return (
    <section className={`space-y-4 rounded-2xl border border-white/[0.08] bg-black/18 p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Sliders className="h-4 w-4 text-brand-300" />
        <h4 className="text-sm font-bold text-white">Ajustes do efeito</h4>
        {effect.needsPerson && (
          <span className="ml-auto rounded-full border border-brand-300/25 bg-brand-500/14 px-2 py-0.5 text-[10px] font-bold text-brand-100">
            detecta pessoa
          </span>
        )}
      </div>

      {/* Intensidade mestre */}
      <label className="block space-y-1.5">
        <span className="flex items-center justify-between text-xs font-semibold text-white/70">
          Intensidade
          <span className="text-white/40">{Math.round(intensity * 100)}%</span>
        </span>
        <input
          type="range"
          min={0.2}
          max={2}
          step={0.1}
          value={intensity}
          onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
          className="w-full accent-brand-400"
        />
      </label>

      {controls.map((control) => {
        if (control.type === 'slider') {
          const value = paramAsNumber(params[control.key], control.min);
          return (
            <label key={control.key} className="block space-y-1.5">
              <span className="flex items-center justify-between text-xs font-semibold text-white/70">
                {control.label}
                <span className="text-white/40">
                  {value}
                  {control.unit || ''}
                </span>
              </span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step ?? 1}
                value={value}
                onChange={(e) => onParamChange(control.key, parseFloat(e.target.value))}
                className="w-full accent-brand-400"
              />
            </label>
          );
        }

        if (control.type === 'select') {
          const value = paramAsString(params[control.key], control.options[0]?.value || '');
          return (
            <div key={control.key} className="space-y-1.5">
              <span className="text-xs font-semibold text-white/70">{control.label}</span>
              <div className="flex flex-wrap gap-1.5">
                {control.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onParamChange(control.key, option.value)}
                    className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                      value === option.value
                        ? 'border-brand-300/50 bg-brand-500/16 text-brand-100'
                        : 'border-white/[0.09] bg-white/[0.04] text-white/60 hover:bg-white/[0.07]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        // color
        const value = paramAsString(params[control.key], control.options?.[0]?.value || 'cyan');
        const options = control.options || [];
        return (
          <div key={control.key} className="space-y-1.5">
            <span className="text-xs font-semibold text-white/70">{control.label}</span>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const swatch = COLOR_SWATCHES[option.value] || option.value;
                const active = value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    onClick={() => onParamChange(control.key, option.value)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      active ? 'scale-110 border-white' : 'border-white/20 hover:scale-105'
                    }`}
                    style={{ background: swatch }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
