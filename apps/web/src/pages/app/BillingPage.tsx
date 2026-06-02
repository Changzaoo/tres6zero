import { useEffect, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { PlanCards } from '@/components/billing/PlanCards';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { createCheckout } from '@/services/billingService';
import { getCurrentUser } from '@/services/authService';
import type { PlanId } from '@/config/plans';

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));
}

function normalizeSelectedPlan(planId?: string | null, isAdmin = false): PlanId | null {
  if (isAdmin) return 'unlimited';
  return planId === 'starter' || planId === 'pro' || planId === 'unlimited' ? planId : null;
}

export default function BillingPage() {
  const { user, hasActiveSubscription, isAdmin } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const periodEnd = formatDate(user?.currentPeriodEnd);
  const selectedPlanId = normalizeSelectedPlan(user?.planId || user?.entitlements?.planId, isAdmin);
  const hasSelectedPlan = Boolean(selectedPlanId && (hasActiveSubscription || isAdmin));
  const selectedDescription = isAdmin
    ? 'Seu acesso administrativo e ilimitado.'
    : hasActiveSubscription && periodEnd
      ? `Seu acesso esta liberado ate ${periodEnd}. A renovacao mantem o mesmo dia da assinatura.`
      : hasActiveSubscription
        ? 'Sua plataforma esta liberada para operar.'
        : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;

    window.history.replaceState({}, '', '/app/billing');

    if (checkout === 'success') {
      toast.info('Pagamento recebido. Assim que a Stripe confirmar, seu acesso sera liberado.');
      getCurrentUser().then((freshUser) => {
        if (freshUser) setUser(freshUser);
      });
    }

    if (checkout === 'cancelled') {
      toast.info('Checkout cancelado.');
    }
  }, [setUser]);

  async function selectPlan(planId: PlanId) {
    try {
      setLoadingPlan(planId);
      const { url } = await createCheckout(planId);
      window.location.assign(url);
    } catch {
      toast.error('Nao foi possivel iniciar o checkout.');
      setLoadingPlan(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {!hasActiveSubscription && !isAdmin && (
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-glass p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-500/15 text-yellow-400">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">
                Conta bloqueada ate o pagamento
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/55">
                {`${user?.name || 'Sua conta'} ja pode entrar, mas as areas principais do SaaS ficam protegidas por cadeado ate a confirmacao do pagamento.`}
              </p>
            </div>
          </div>
        </div>
      )}

      <PlanCards
        ctaLabel={loadingPlan ? 'Abrindo checkout...' : 'Pagar com carteiras digitais'}
        onSelect={selectPlan}
        disabled={Boolean(loadingPlan) || hasActiveSubscription || isAdmin}
        selectedPlanId={hasSelectedPlan ? selectedPlanId : null}
        selectedLabel={isAdmin ? 'Acesso ilimitado' : 'Selecionado'}
        selectedDescription={selectedDescription}
      />
    </div>
  );
}
