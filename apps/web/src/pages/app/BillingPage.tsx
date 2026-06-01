import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { PlanCards } from '@/components/billing/PlanCards';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import type { PlanId } from '@/config/plans';

export default function BillingPage() {
  const { user, hasActiveSubscription } = useAuth();

  function selectPlan(planId: PlanId) {
    toast.info(`Plano selecionado: ${planId}. Integração de pagamento pendente no servidor.`);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-white/8 bg-gradient-glass p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${hasActiveSubscription ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
              {hasActiveSubscription ? <ShieldCheck className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">
                {hasActiveSubscription ? 'Assinatura ativa' : 'Conta bloqueada até o pagamento'}
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/55">
                {hasActiveSubscription
                  ? 'Sua plataforma está liberada para operar.'
                  : `${user?.name || 'Sua conta'} já pode entrar, mas as áreas principais do SaaS ficam protegidas por cadeado até a assinatura ser confirmada.`}
              </p>
            </div>
          </div>

          {!hasActiveSubscription && (
            <Button
              variant="outline"
              className="w-full justify-center sm:w-auto"
              onClick={() => toast.info('Conecte o provedor de pagamento no backend para liberar checkout automático.')}
            >
              Aguardando checkout
            </Button>
          )}
        </div>
      </div>

      <PlanCards ctaLabel="Selecionar plano" onSelect={selectPlan} disabled={hasActiveSubscription} />
    </div>
  );
}
