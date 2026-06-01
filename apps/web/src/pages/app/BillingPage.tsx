import { useEffect, useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
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

export default function BillingPage() {
  const { user, hasActiveSubscription, isAdmin } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const periodEnd = formatDate(user?.currentPeriodEnd);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;

    window.history.replaceState({}, '', '/app/billing');

    if (checkout === 'success') {
      toast.info('Pagamento recebido. Assim que a Stripe confirmar o Pix, seu acesso será liberado.');
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
      toast.error('Não foi possível iniciar o checkout Pix.');
      setLoadingPlan(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-glass p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${hasActiveSubscription ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
              {hasActiveSubscription ? <ShieldCheck className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">
                {hasActiveSubscription ? 'Acesso ativo' : 'Conta bloqueada até o pagamento'}
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/55">
                {isAdmin && 'Seu acesso administrativo é ilimitado.'}
                {!isAdmin && hasActiveSubscription && periodEnd && `Seu acesso está liberado até ${periodEnd}. A renovação mantém o mesmo dia da assinatura.`}
                {!isAdmin && hasActiveSubscription && !periodEnd && 'Sua plataforma está liberada para operar.'}
                {!hasActiveSubscription && `${user?.name || 'Sua conta'} já pode entrar, mas as áreas principais do SaaS ficam protegidas por cadeado até a confirmação do Pix.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <PlanCards
        ctaLabel={loadingPlan ? 'Abrindo checkout...' : 'Pagar com Pix'}
        onSelect={selectPlan}
        disabled={Boolean(loadingPlan) || hasActiveSubscription}
      />
    </div>
  );
}
