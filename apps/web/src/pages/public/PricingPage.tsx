import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PlanCards } from '@/components/billing/PlanCards';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { PlanId } from '@/config/plans';

export default function PricingPage() {
  const navigate = useNavigate();

  function selectPlan(planId: PlanId) {
    navigate(`/register?plan=${planId}`);
  }

  return (
    <div className="six3-grid-bg min-h-screen bg-surface px-4 py-4 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="relative z-10 mx-auto max-w-7xl">
        <nav className="mb-8 flex items-center justify-between gap-3 sm:mb-10">
          <button
            onClick={() => navigate('/')}
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm text-white/55 transition hover:bg-white/[0.055] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <BrandLogo className="hidden items-center sm:flex" wordmarkClassName="text-2xl" />
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="shrink-0">
            Entrar
          </Button>
        </nav>

        <section
          className="mx-auto mb-8 overflow-hidden text-center sm:mb-10"
          style={{ width: 'min(calc(100vw - 2rem), 48rem)' }}
        >
          <div className="mx-auto mb-5 flex w-full max-w-[20rem] flex-wrap items-center justify-center gap-2 rounded-[22px] border border-brand-400/25 bg-brand-500/10 px-3 py-2 text-xs leading-snug text-brand-200 sm:inline-flex sm:w-auto sm:max-w-full sm:flex-nowrap sm:rounded-full sm:px-4 sm:text-sm">
            <LockKeyhole className="h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">Recursos bloqueados até o pagamento</span>
          </div>
          <h1 className="mx-auto max-w-[18rem] text-3xl font-black leading-tight tracking-normal text-white sm:max-w-none sm:text-5xl lg:text-6xl">
            Escolha sua jornada no <span className="block whitespace-nowrap sm:inline">SIX3<span className="brand-degree">°</span></span>
          </h1>
          <p className="mx-auto mt-4 max-w-[18rem] text-sm leading-relaxed text-white/55 sm:max-w-2xl sm:text-lg">
            Escolha um plano, crie sua conta e libere templates, galerias, QR Codes, leads, modo offline e analytics.
          </p>
        </section>

        <PlanCards ctaLabel="Escolher plano" onSelect={selectPlan} />
      </div>
    </div>
  );
}
