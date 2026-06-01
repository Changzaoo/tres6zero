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
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/8 bg-gradient-glass p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${hasActiveSubscription ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
              {hasActiveSubscription ? <ShieldCheck className="w-5 h-5" /> : <LockKeyhole className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {hasActiveSubscription ? 'Assinatura ativa' : 'Conta bloqueada até o pagamento'}
              </h1>
              <p className="text-sm text-white/50 mt-1">
                {hasActiveSubscription
                  ? 'Sua plataforma está liberada para operar.'
                  : `${user?.name || 'Sua conta'} já pode entrar, mas eventos, vídeos, leads e analytics ficam protegidos por cadeado até a assinatura ser confirmada.`}
              </p>
            </div>
          </div>

          {!hasActiveSubscription && (
            <Button variant="outline" onClick={() => toast.info('Conecte o provedor de pagamento no backend para liberar checkout automático.')}>
              Aguardando checkout
            </Button>
          )}
        </div>
      </div>

      <PlanCards ctaLabel="Selecionar plano" onSelect={selectPlan} disabled={hasActiveSubscription} />
    </div>
  );
}
