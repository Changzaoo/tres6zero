import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Video,
  Layers,
  BarChart2,
  Settings,
  LogOut,
  Camera,
  Shield,
  Lock,
  CreditCard,
  LifeBuoy,
} from 'lucide-react';
import { logout } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/components/ui/Toast';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface SidebarProps {
  onClose?: () => void;
}

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/events', label: 'Eventos', icon: Calendar },
  { to: '/app/gravar', label: 'Gravar', icon: Camera },
  { to: '/app/videos', label: 'Vídeos', icon: Video, unlocked: true },
  { to: '/app/templates', label: 'Templates', icon: Layers },
  { to: '/app/leads', label: 'Resultados', icon: BarChart2 },
  { to: '/app/billing', label: 'Planos', icon: CreditCard, unlocked: true },
  { to: '/app/settings', label: 'Configurações', icon: Settings, unlocked: true },
  { to: '/app/support', label: 'Suporte', icon: LifeBuoy, unlocked: true },
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
      <div className="flex h-[68px] items-center overflow-hidden border-b border-white/[0.08] px-5">
        <div className="relative h-full w-full overflow-hidden">
          <img
            src="/brand/six3.png"
            alt="SIX3"
            className="absolute left-1/2 top-[55%] w-[430px] max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
            draggable={false}
          />
        </div>
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
                    ? 'border border-brand-400/30 bg-brand-500/[0.18] text-white shadow-[0_0_0_1px_rgba(59,109,255,.15)_inset,0_18px_44px_-28px_rgba(59,109,255,.75)]'
                    : 'text-white/45 hover:bg-white/[0.055] hover:text-white/90'
                } ${locked ? 'opacity-60' : ''}`
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
              `mt-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all ${
                isActive ? 'border border-yellow-500/25 bg-yellow-500/[0.14] text-yellow-200' : 'text-white/45 hover:bg-white/[0.055] hover:text-white/90'
              }`
            }
          >
            <Shield className="h-[18px] w-[18px]" />
            <span className="flex-1">Admin</span>
          </NavLink>
        )}
      </nav>

      <div className="border-t border-white/[0.08] p-3">
        <div className="mb-1 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-sm font-black text-white shadow-glow ring-1 ring-white/15">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              : user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white/90">{user?.name}</p>
            <p className={`truncate font-mono text-[10px] ${hasActiveSubscription ? 'text-emerald-400/80' : 'text-white/35'}`}>
              {hasActiveSubscription ? 'Ativo' : 'Sem assinatura'}
            </p>
          </div>
          <NotificationBell />
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-white/35 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sair da conta</span>
        </button>
      </div>
    </div>
  );

  return <aside className="hidden shrink-0 lg:block">{content}</aside>;
}
