import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PlanCards } from '@/components/billing/PlanCards';
import type { PlanId } from '@/config/plans';

export default function PricingPage() {
  const navigate = useNavigate();

  function selectPlan(planId: PlanId) {
    navigate(`/register?plan=${planId}`);
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-4 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-8 flex items-center justify-between gap-3 sm:mb-10">
          <button
            onClick={() => navigate('/')}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm text-white/55 transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="shrink-0">
            Entrar
          </Button>
        </nav>

        <section className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
          <div className="mb-5 inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-2 text-xs leading-snug text-brand-300 sm:px-4 sm:text-sm">
            <LockKeyhole className="h-4 w-4 shrink-0" />
            <span className="min-w-0">Cadastro liberado, recursos bloqueados até o pagamento</span>
          </div>
          <h1 className="text-3xl font-black leading-tight tracking-normal text-white sm:text-5xl lg:text-6xl">
            Comece sua jornada 360
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg">
            Escolha um plano, crie sua conta e libere templates, galerias, QR Codes, leads, modo offline e analytics.
          </p>
        </section>

        <PlanCards ctaLabel="Escolher plano" onSelect={selectPlan} />
      </div>
    </div>
  );
}
