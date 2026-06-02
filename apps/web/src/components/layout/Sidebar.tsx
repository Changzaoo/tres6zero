import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Video,
  Layers,
  Users,
  BarChart2,
  Settings,
  LogOut,
  Camera,
  Shield,
  Lock,
  CreditCard,
  Bell,
} from 'lucide-react';
import { logout } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/components/ui/Toast';
import { BrandLogo } from '@/components/brand/BrandLogo';

interface SidebarProps {
  onClose?: () => void;
}

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/events', label: 'Eventos', icon: Calendar },
  { to: '/app/operator', label: 'Modo Operador', icon: Camera },
  { to: '/app/videos', label: 'Vídeos', icon: Video },
  { to: '/app/templates', label: 'Templates', icon: Layers },
  { to: '/app/leads', label: 'Leads', icon: Users },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/app/billing', label: 'Planos', icon: CreditCard, unlocked: true },
  { to: '/app/settings', label: 'Configurações', icon: Settings, unlocked: true },
];

export function Sidebar({ onClose }: SidebarProps) {
  const { user, isAdmin, hasActiveSubscription } = useAuth();
  const resetAuth = useAuthStore((state) => state.reset);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    resetAuth();
    navigate('/login');
    toast.success('Até logo!');
  }

  const content = (
    <div className="flex h-full w-64 flex-col border-r border-white/[0.08] bg-[#0e1016]/90 backdrop-blur-2xl">
      <div className="flex h-[84px] items-center justify-center border-b border-white/[0.08] px-4 py-0">
        <BrandLogo className="items-center" wordmarkClassName="text-5xl" />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map(({ to, label, icon: Icon, unlocked }) => {
          const locked = !hasActiveSubscription && !unlocked;
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'border border-brand-400/25 bg-brand-500/15 text-brand-100 shadow-[0_16px_44px_-30px_rgba(59,109,255,.8)]'
                    : 'text-white/50 hover:bg-white/[0.055] hover:text-white/90'
                } ${locked ? 'opacity-70' : ''}`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1">{label}</span>
              {locked && <Lock className="h-3.5 w-3.5 text-white/30" />}
            </NavLink>
          );
        })}

        {isAdmin && (
          <NavLink
            to="/app/admin"
            onClick={onClose}
            className={({ isActive }) =>
              `mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all ${
                isActive ? 'border border-yellow-500/20 bg-yellow-500/15 text-yellow-300' : 'text-white/50 hover:bg-white/[0.055] hover:text-white/90'
              }`
            }
          >
            <Shield className="h-[18px] w-[18px]" />
            <span className="flex-1">Admin</span>
          </NavLink>
        )}
      </nav>

      <div className="border-t border-white/[0.08] p-2">
        <div className="mb-0.5 flex items-center gap-2 px-1.5 py-1">
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-white shadow-glow ring-1 ring-white/15">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button
              type="button"
              aria-label="Notificações"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-white/45 transition-colors hover:bg-white/[0.09] hover:text-white"
            >
              <Bell className="h-3 w-3" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-white/80">{user?.name}</p>
            <p className="truncate text-[10px] text-white/40">
              {hasActiveSubscription ? 'Assinatura ativa' : 'Aguardando pagamento'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-2xl px-1.5 py-1.5 text-[11px] text-white/40 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );

  return <aside className="hidden shrink-0 lg:block">{content}</aside>;
}
