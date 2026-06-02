import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart2,
  Calendar,
  Camera,
  CreditCard,
  Layers,
  LifeBuoy,
  LayoutDashboard,
  Lock,
  Menu,
  Settings,
  Shield,
  Users,
  Video,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const mobileItems = [
  { to: '/app/events', label: 'Eventos', icon: Calendar },
  { to: '/app/videos', label: 'Vídeos', icon: Video, unlocked: true },
  { to: '/app/operator', label: 'Operar', icon: Camera, primary: true },
  { to: '/app/templates', label: 'Templates', icon: Layers },
  { to: '/app/billing', label: 'Planos', icon: CreditCard, unlocked: true },
];

const moreItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/leads', label: 'Leads', icon: Users },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/app/support', label: 'Suporte', icon: LifeBuoy, unlocked: true },
  { to: '/app/settings', label: 'Configurações', icon: Settings, unlocked: true },
];

export function MobileBottomNav() {
  const { isAdmin, hasActiveSubscription } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const items = isAdmin
    ? [...moreItems, { to: '/app/admin', label: 'Admin', icon: Shield, unlocked: true }]
    : moreItems;

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  function isLocked(unlocked?: boolean) {
    return !hasActiveSubscription && !unlocked;
  }

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar mais opções"
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),0.5rem)+5.6rem)] mx-auto max-w-md rounded-[26px] border border-white/[0.1] bg-[#0e1016]/95 p-2 shadow-2xl shadow-black/55 backdrop-blur-2xl">
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
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-[#0e1016]/85 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-6 items-end gap-1 rounded-[26px] border border-white/[0.08] bg-black/25 p-1.5 shadow-2xl shadow-black/45">
          {mobileItems.map(({ to, label, icon: Icon, primary, unlocked }) => {
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
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold transition-all ${
              moreOpen ? 'bg-white/[0.09] text-white' : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80'
            }`}
          >
            <Menu className="h-[18px] w-[18px]" />
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}
