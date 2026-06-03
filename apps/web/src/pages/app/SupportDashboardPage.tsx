import { LifeBuoy, MessageSquareReply, ShieldCheck } from 'lucide-react';
import { AdminSupportPanel } from '@/components/support/AdminSupportPanel';

export default function SupportDashboardPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/[0.08] bg-gradient-glass p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-100 ring-1 ring-brand-300/20">
              <LifeBuoy className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Painel de suporte</h1>
              <p className="mt-1 text-sm text-white/42">Atendimento de mensagens e triagem basica.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-bold text-white/62">
              <MessageSquareReply className="h-3.5 w-3.5 text-brand-200" />
              Responder chamados
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-bold text-white/62">
              <ShieldCheck className="h-3.5 w-3.5 text-green-200" />
              Acesso limitado
            </span>
          </div>
        </div>
      </section>

      <AdminSupportPanel />
    </div>
  );
}
