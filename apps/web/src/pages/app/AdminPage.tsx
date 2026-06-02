import { useEffect, useState } from 'react';
import { Shield, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminSession } from '@/services/authService';
import { getPaidCustomers } from '@/services/billingService';
import { useAuthStore } from '@/store/authStore';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from '@/components/ui/Toast';
import { AdminSupportPanel } from '@/components/support/AdminSupportPanel';
import type { PlanId } from '@/config/plans';
import type { UserProfile } from '@/types';

type PaidCustomer = {
  id: string;
  name: string | null;
  email: string | null;
  planId: PlanId | null;
  currentPeriodEnd: string | null;
  renewalDay: number | null;
};

function formatDate(value: string | null) {
  if (!value) return 'Sem vencimento';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));
}

export default function AdminPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [adminUser, setAdminUser] = useState<UserProfile | null>(null);
  const [customers, setCustomers] = useState<PaidCustomer[]>([]);

  useEffect(() => {
    let mounted = true;

    getAdminSession()
      .then(({ user }) => {
        if (!mounted) return;
        setAdminUser(user);
        setUser(user);
        return getPaidCustomers();
      })
      .then((result) => {
        if (!mounted || !result) return;
        setCustomers(result.customers);
      })
      .catch(() => {
        if (!mounted) return;
        toast.error('Acesso restrito ao administrador.');
        navigate('/app/billing', { replace: true });
      });

    return () => {
      mounted = false;
    };
  }, [navigate, setUser]);

  if (!adminUser) {
    return <LoadingState message="Validando acesso administrativo..." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Admin</h1>
          <p className="text-sm text-white/40">Sessão administrativa confirmada</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Cargo" value="Admin" icon={<ShieldCheck className="h-5 w-5" />} color="text-yellow-400" />
        <StatCard title="Clientes ativos" value={customers.length} icon={<Users className="h-5 w-5" />} color="text-green-400" />
      </div>

      <div className="rounded-2xl border border-yellow-500/20 bg-gradient-glass p-5">
        <p className="text-sm text-white/60">
          Administrador logado: <span className="font-medium text-white">{adminUser.name}</span>
        </p>
        <p className="mt-1 text-xs text-white/30">
          Acesso confirmado pela API do servidor.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-gradient-glass p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-brand-400" />
          <h2 className="text-base font-semibold text-white">Clientes com acesso</h2>
        </div>

        {customers.length === 0 ? (
          <p className="text-sm text-white/45">Nenhum cliente pago ativo no momento.</p>
        ) : (
          <div className="space-y-2">
            {customers.map((customer) => (
              <div key={customer.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{customer.name || customer.email || 'Cliente'}</p>
                    <p className="truncate text-xs text-white/40">{customer.email}</p>
                  </div>
                  <div className="text-left text-xs text-white/45 sm:text-right">
                    <p className="capitalize">{customer.planId || 'plano'}</p>
                    <p>Até {formatDate(customer.currentPeriodEnd)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdminSupportPanel />
    </div>
  );
}
