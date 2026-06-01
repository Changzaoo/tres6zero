import { useEffect, useState } from 'react';
import { Shield, Users, Calendar, Video } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getAllEvents } from '@/services/eventService';
import { getAllLeads } from '@/services/leadService';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from '@/components/ui/Toast';

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ events: 0, leads: 0 });

  useEffect(() => {
    if (!isAdmin) { toast.error('Acesso restrito a administradores.'); navigate('/app/dashboard'); return; }
    Promise.all([getAllEvents(), getAllLeads()]).then(([events, leads]) => {
      setStats({ events: events.length, leads: leads.length });
    });
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Admin</h1>
          <p className="text-white/40 text-sm">Painel administrativo</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total eventos" value={stats.events} icon={<Calendar className="w-5 h-5" />} />
        <StatCard title="Total leads" value={stats.leads} icon={<Users className="w-5 h-5" />} color="text-yellow-400" />
      </div>

      <div className="bg-gradient-glass border border-yellow-500/20 rounded-2xl p-5">
        <p className="text-sm text-white/60">Administrador logado: <span className="text-white font-medium">{user?.name}</span></p>
        <p className="text-xs text-white/30 mt-1">Área administrativa. Mais recursos serão adicionados em versões futuras.</p>
      </div>
    </div>
  );
}
