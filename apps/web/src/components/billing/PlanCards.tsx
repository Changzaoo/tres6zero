import { Check, Crown } from 'lucide-react';
import { PLANS, type PlanId } from '@/config/plans';
import { Button } from '@/components/ui/Button';

type PlanCardsProps = {
  ctaLabel: string;
  onSelect: (planId: PlanId) => void;
  disabled?: boolean;
};

export function PlanCards({ ctaLabel, onSelect, disabled }: PlanCardsProps) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {PLANS.map((plan) => (
        <div
          key={plan.id}
          className={`relative rounded-2xl border p-5 bg-gradient-glass ${plan.highlight ? 'border-brand-500/50 shadow-lg shadow-brand-600/20' : 'border-white/8'}`}
        >
          {plan.highlight && (
            <div className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
              <Crown className="w-3 h-3" />
              Mais escolhido
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
            <p className="text-sm text-white/45 min-h-[40px]">{plan.tagline}</p>
            <div className="flex items-end gap-1 pt-2">
              <span className="text-sm text-white/40">R$</span>
              <span className="text-4xl font-black text-white">{plan.price}</span>
              <span className="text-sm text-white/40 pb-1">/mês</span>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {plan.features.map((feature) => (
              <div key={feature} className="flex items-start gap-2 text-sm text-white/65">
                <Check className="w-4 h-4 mt-0.5 text-green-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <Button
            className="w-full justify-center mt-6"
            variant={plan.highlight ? 'primary' : 'secondary'}
            disabled={disabled}
            onClick={() => onSelect(plan.id as PlanId)}
          >
            {plan.id === 'unlimited' ? 'Liberar ilimitado' : ctaLabel}
          </Button>
        </div>
      ))}
    </div>
  );
}
