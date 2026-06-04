import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Camera,
  CreditCard,
  Layers,
  LifeBuoy,
  LayoutDashboard,
  Lock,
  LogOut,
  Settings,
  Shield,
  Video,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/components/ui/Toast';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { currentPlanLabel, planExpirationLabel } from '@/utils/subscriptionDisplay';

const mobileItems = [
  { to: '/app/events', label: 'Eventos', icon: Calendar },
  { to: '/app/videos', label: 'Vídeos', icon: Video, unlocked: true },
  { to: '/app/gravar', label: 'Gravar', icon: Camera, primary: true },
  { to: '/app/templates', label: 'Templates', icon: Layers },
];

const supportMobileItems = [
  { to: '/app/support-dashboard', label: 'Suporte', icon: LifeBuoy, unlocked: true, primary: false },
];

const accountItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/billing', label: 'Planos', icon: CreditCard, unlocked: true },
  { to: '/app/settings', label: 'Configurações', icon: Settings, unlocked: true },
  { to: '/app/support', label: 'Suporte', icon: LifeBuoy, unlocked: true },
];

function ProfileBubble({ avatarUrl, initial, size = 'sm' }: { avatarUrl?: string; initial: string; size?: 'sm' | 'md' }) {
  const dimension = size === 'md' ? 'h-10 w-10 text-sm' : 'h-[22px] w-[22px] text-[10px]';
  return (
    <span className={`flex ${dimension} shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-brand font-black text-white ring-1 ring-white/15`}>
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
    </span>
  );
}

export function MobileBottomNav() {
  const { user, isAdmin, isSupport, hasActiveSubscription } = useAuth();
  const resetAuth = useAuthStore((state) => state.reset);
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const items = isSupport
    ? []
    : isAdmin
    ? [...accountItems, { to: '/app/admin', label: 'Admin', icon: Shield, unlocked: true }]
    : accountItems;
  const visibleMobileItems = isSupport ? supportMobileItems : mobileItems;
  const initial = user?.name?.charAt(0).toUpperCase() || 'U';
  const accountPlan = currentPlanLabel(user);
  const accountExpiration = planExpirationLabel(user);
  const accountExpirationClass = isSupport || hasActiveSubscription ? 'text-emerald-300/75' : 'text-white/35';

  useEffect(() => {
    setAccountOpen(false);
  }, [location.pathname]);

  function isLocked(unlocked?: boolean) {
    return !hasActiveSubscription && !unlocked;
  }

  async function handleLogout() {
    await logout();
    resetAuth();
    setAccountOpen(false);
    navigate('/login');
    toast.success('Até logo!');
  }

  return (
    <>
      {accountOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar opções da conta"
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setAccountOpen(false)}
          />
          <div className="absolute inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),0.5rem)+5.6rem)] mx-auto max-w-md rounded-[26px] border border-white/[0.1] bg-[#0e1016]/95 p-2 shadow-2xl shadow-black/55 backdrop-blur-2xl">
            <div className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2">
              <ProfileBubble avatarUrl={user?.avatarUrl} initial={initial} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{user?.name || 'Conta'}</p>
                <p className="truncate text-xs font-semibold leading-tight text-white/58">{accountPlan}</p>
                <p className={`truncate text-[11px] leading-tight ${accountExpirationClass}`}>{accountExpiration}</p>
              </div>
              <NotificationBell />
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sair da conta"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-red-300/15 bg-red-500/10 px-3 text-xs font-bold text-red-100/80 transition-all hover:bg-red-500/18 hover:text-red-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>

            {items.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {items.map(({ to, label, icon: Icon, unlocked }) => {
                  const locked = isLocked(unlocked);
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `relative flex min-h-[52px] items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-brand-500/18 text-brand-100 ring-1 ring-brand-400/25'
                            : 'bg-white/[0.045] text-white/68 hover:bg-white/[0.075] hover:text-white'
                        } ${locked ? 'opacity-65' : ''}`
                      }
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="min-w-0 truncate">{label}</span>
                      {locked && <Lock className="absolute right-2 top-2 h-3 w-3 text-white/35" />}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-[#0e1016]/85 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-2xl lg:hidden">
        <div className={`mx-auto grid max-w-md ${isSupport ? 'grid-cols-2' : 'grid-cols-5'} items-end gap-1 rounded-[26px] border border-white/[0.08] bg-black/25 p-1.5 shadow-2xl shadow-black/45`}>
          {visibleMobileItems.map(({ to, label, icon: Icon, primary, unlocked }) => {
            const locked = isLocked(unlocked);
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition-all ${
                    primary
                      ? 'min-h-[58px] -translate-y-3 bg-gradient-brand text-white shadow-glow ring-1 ring-white/15'
                      : isActive
                        ? 'bg-white/[0.09] text-white'
                        : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80'
                  } ${locked ? 'opacity-65' : ''}`
                }
              >
                <Icon className={primary ? 'h-5 w-5' : 'h-[18px] w-[18px]'} />
                <span className="max-w-full truncate">{label}</span>
                {locked && <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-white/35" />}
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition-all ${
              accountOpen ? 'bg-white/[0.09] text-white' : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80'
            }`}
          >
            <ProfileBubble avatarUrl={user?.avatarUrl} initial={initial} />
            <span>Conta</span>
          </button>
        </div>
      </nav>
    </>
  );
}
