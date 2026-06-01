import { useRef, useState } from 'react';
import { Check, Crown, Info } from 'lucide-react';
import { PLANS, type PlanId } from '@/config/plans';
import { Button } from '@/components/ui/Button';

type PlanCardsProps = {
  ctaLabel: string;
  onSelect: (planId: PlanId) => void;
  disabled?: boolean;
};

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function PlanCards({ ctaLabel, onSelect, disabled }: PlanCardsProps) {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const lastPointerType = useRef<string | null>(null);

  return (
    <div
      className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 md:mx-0 md:overflow-visible md:px-0 md:pb-0"
      aria-label="Planos disponíveis"
    >
      <div className="flex snap-x snap-mandatory gap-3 sm:gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex min-h-full w-[min(86vw,23.5rem)] shrink-0 snap-center flex-col overflow-visible rounded-2xl border bg-gradient-glass p-4 sm:p-5 md:w-auto md:max-w-none lg:p-6 ${plan.highlight ? 'border-brand-500/50 shadow-lg shadow-brand-600/20' : 'border-white/8'}`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-brand-600/25 sm:left-5">
                <Crown className="w-3 h-3" />
                Mais escolhido
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-lg font-bold leading-tight text-white">{plan.name}</h3>
              <p className="min-h-0 text-sm leading-relaxed text-white/50 sm:min-h-[44px]">{plan.tagline}</p>
              <div className="flex flex-wrap items-end gap-x-1 gap-y-0 pt-1 sm:pt-2">
                <span className="pb-1 text-sm text-white/40">R$</span>
                <span className="whitespace-nowrap text-4xl font-black leading-none text-white sm:text-[2.65rem]">
                  {priceFormatter.format(plan.price)}
                </span>
                <span className="pb-1 text-sm text-white/40">/mês</span>
              </div>
            </div>

            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((feature, index) => {
                const featureKey = `${plan.id}-${index}`;
                const isActive = activeFeature === featureKey;
                const tooltipId = `plan-${plan.id}-feature-${index}`;
                const tooltipPosition = index >= plan.features.length - 2
                  ? 'md:bottom-full md:mb-2 md:mt-0'
                  : 'md:top-full md:mt-2';

                return (
                  <li
                    key={feature.label}
                    className="relative"
                    onPointerEnter={(event) => {
                      if (event.pointerType === 'mouse') setActiveFeature(featureKey);
                    }}
                    onPointerLeave={(event) => {
                      if (event.pointerType === 'mouse') {
                        setActiveFeature((current) => (current === featureKey ? null : current));
                      }
                    }}
                  >
                    <button
                      type="button"
                      aria-expanded={isActive}
                      aria-controls={isActive ? tooltipId : undefined}
                      aria-describedby={isActive ? tooltipId : undefined}
                      className={`group flex min-h-[44px] w-full min-w-0 items-start gap-2 rounded-xl border px-2.5 py-2 text-left text-sm leading-snug transition focus:outline-none focus-visible:border-brand-400/60 focus-visible:bg-brand-500/10 focus-visible:ring-2 focus-visible:ring-brand-500/25 sm:px-3 ${isActive ? 'border-brand-500/35 bg-brand-500/10 text-white' : 'border-transparent text-white/70 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'}`}
                      onPointerDown={(event) => {
                        lastPointerType.current = event.pointerType;
                      }}
                      onClick={() => {
                        if (lastPointerType.current === 'touch' || lastPointerType.current === 'pen') {
                          setActiveFeature((current) => (current === featureKey ? null : featureKey));
                        }
                      }}
                      onFocus={() => {
                        if (lastPointerType.current !== 'touch' && lastPointerType.current !== 'pen') {
                          setActiveFeature(featureKey);
                        }
                      }}
                      onBlur={() => {
                        lastPointerType.current = null;
                        setActiveFeature((current) => (current === featureKey ? null : current));
                      }}
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                      <span className="min-w-0 flex-1 break-words">{feature.label}</span>
                      <Info className={`mt-0.5 h-4 w-4 shrink-0 transition ${isActive ? 'text-brand-300' : 'text-white/25 group-hover:text-white/45'}`} />
                    </button>

                    {isActive && (
                      <div
                        id={tooltipId}
                        role="tooltip"
                        className={`z-30 mt-2 rounded-xl border border-white/10 bg-surface-50/95 p-3 text-xs leading-relaxed text-white/70 shadow-2xl shadow-black/30 backdrop-blur-sm md:absolute md:left-0 md:right-0 ${tooltipPosition}`}
                      >
                        {feature.description}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <Button
              className="mt-6 w-full justify-center"
              variant={plan.highlight ? 'primary' : 'secondary'}
              disabled={disabled}
              onClick={() => onSelect(plan.id)}
            >
              {plan.id === 'unlimited' ? 'Liberar ilimitado' : ctaLabel}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
