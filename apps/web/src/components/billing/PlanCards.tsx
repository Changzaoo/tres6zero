import { useRef, useState } from 'react';
import { Check, Crown, Info, ShieldCheck } from 'lucide-react';
import { PLANS, type PlanId } from '@/config/plans';
import { Button } from '@/components/ui/Button';

type PlanCardsProps = {
  ctaLabel: string;
  onSelect: (planId: PlanId) => void;
  disabled?: boolean;
  selectedPlanId?: PlanId | null;
  selectedLabel?: string;
  selectedDescription?: string | null;
};

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function PlanCards({ ctaLabel, onSelect, disabled, selectedPlanId, selectedLabel = 'Selecionado', selectedDescription }: PlanCardsProps) {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const lastPointerType = useRef<string | null>(null);

  return (
    <div
      className="hide-scrollbar -mx-4 overflow-x-auto px-4 pb-3 pt-4 sm:-mx-6 sm:px-6 md:mx-0 md:overflow-visible md:px-0 md:pb-0 md:pt-4"
      aria-label="Planos disponíveis"
    >
      <div className="flex snap-x snap-mandatory gap-3 sm:gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
        {PLANS.map((plan) => {
          const isSelected = selectedPlanId === plan.id;

          return (
          <div
            key={plan.id}
            className={`six3-glass six3-card-hover relative flex min-h-full w-[86vw] max-w-[23.5rem] shrink-0 snap-center flex-col overflow-visible p-4 sm:p-5 md:w-auto md:max-w-none lg:p-6 ${
              isSelected
                ? 'border-emerald-300/55 shadow-[0_0_0_1px_rgba(110,231,183,0.28),0_24px_90px_-50px_rgba(16,185,129,0.75)]'
                : plan.highlight ? 'border-brand-400/50 shadow-glow' : ''
            }`}
          >
            {plan.highlight && !isSelected && (
              <div className="absolute -top-3 left-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-1 rounded-full bg-gradient-brand px-3 py-1 text-xs font-semibold text-white shadow-glow sm:left-5">
                <Crown className="h-3 w-3" />
                Mais escolhido
              </div>
            )}
            {isSelected && (
              <div className="absolute -top-3 left-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white shadow-[0_14px_40px_-22px_rgba(16,185,129,1)] sm:left-5">
                <ShieldCheck className="h-3 w-3" />
                {selectedLabel}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-lg font-bold leading-tight text-white">{plan.name}</h3>
              <p className="min-h-0 text-sm leading-relaxed text-white/50 sm:min-h-[44px]">{plan.tagline}</p>
              <div className="flex flex-wrap items-end gap-x-1 gap-y-0 pt-1 sm:pt-2">
                <span className="pb-1 text-sm text-white/40">R$</span>
                <span className="whitespace-nowrap text-4xl font-black leading-none tracking-[-0.04em] text-white sm:text-[2.65rem]">
                  {priceFormatter.format(plan.price)}
                </span>
                <span className="pb-1 text-sm text-white/40">/mês</span>
              </div>
              {isSelected && selectedDescription && (
                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-xs leading-relaxed text-emerald-50/82">
                  {selectedDescription}
                </div>
              )}
            </div>

            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((feature, index) => {
                const featureKey = `${plan.id}-${index}`;
                const isActive = activeFeature === featureKey;
                const tooltipId = `plan-${plan.id}-feature-${index}`;
                const tooltipPosition = index >= plan.features.length - 2 ? 'md:bottom-full md:mb-2 md:mt-0' : 'md:top-full md:mt-2';

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
                      className={`group flex min-h-[44px] w-full min-w-0 items-start gap-2 rounded-2xl border px-2.5 py-2 text-left text-sm leading-snug transition focus:outline-none focus-visible:border-brand-400/60 focus-visible:bg-brand-500/10 focus-visible:ring-2 focus-visible:ring-brand-500/25 sm:px-3 ${
                        isActive
                          ? 'border-brand-400/35 bg-brand-500/10 text-white'
                          : 'border-transparent text-white/70 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'
                      }`}
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
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="min-w-0 flex-1 break-words">{feature.label}</span>
                      <Info className={`mt-0.5 h-4 w-4 shrink-0 transition ${isActive ? 'text-brand-300' : 'text-white/25 group-hover:text-white/45'}`} />
                    </button>

                    {isActive && (
                      <div
                        id={tooltipId}
                        role="tooltip"
                        className={`z-30 mt-2 rounded-2xl border border-white/10 bg-surface-50/95 p-3 text-xs leading-relaxed text-white/70 shadow-2xl shadow-black/35 backdrop-blur-xl md:absolute md:left-0 md:right-0 ${tooltipPosition}`}
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
              variant={plan.highlight || isSelected ? 'primary' : 'secondary'}
              disabled={disabled}
              onClick={() => onSelect(plan.id)}
            >
              {isSelected ? selectedLabel : disabled ? 'Acesso ativo' : plan.id === 'unlimited' ? 'Liberar ilimitado' : ctaLabel}
            </Button>
          </div>
          );
        })}
      </div>
    </div>
  );
}
