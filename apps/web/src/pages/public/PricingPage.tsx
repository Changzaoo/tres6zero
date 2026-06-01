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
    <div className="min-h-screen bg-surface text-white px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <nav className="flex items-center justify-between mb-10">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-white/50 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Entrar</Button>
        </nav>

        <section className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-4 py-2 text-sm text-brand-300 mb-5">
            <LockKeyhole className="w-4 h-4" />
            Cadastro liberado, recursos bloqueados até o pagamento
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-normal">Comece sua jornada 360</h1>
          <p className="text-white/50 mt-4 text-lg">
            Escolha um plano, crie sua conta e libere eventos, vídeos, QR Codes, leads, templates e analytics.
          </p>
        </section>

        <PlanCards ctaLabel="Escolher plano" onSelect={selectPlan} />
      </div>
    </div>
  );
}
