import { NavLink } from 'react-router-dom';
import { Calendar, Camera, CreditCard, Layers, Lock, Menu, Video } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type MobileBottomNavProps = {
  onMoreClick: () => void;
};

const mobileItems = [
  { to: '/app/events', label: 'Eventos', icon: Calendar },
  { to: '/app/videos', label: 'Vídeos', icon: Video },
  { to: '/app/operator', label: 'Operar', icon: Camera, primary: true },
  { to: '/app/templates', label: 'Templates', icon: Layers },
  { to: '/app/billing', label: 'Planos', icon: CreditCard, unlocked: true },
];

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const { hasActiveSubscription } = useAuth();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0e1016]/85 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-2xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-6 items-end gap-1 rounded-[26px] border border-white/[0.08] bg-black/25 p-1.5 shadow-2xl shadow-black/45">
        {mobileItems.map(({ to, label, icon: Icon, primary, unlocked }) => {
          const locked = !hasActiveSubscription && !unlocked;
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
          onClick={onMoreClick}
          className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold text-white/45 transition-all hover:bg-white/[0.06] hover:text-white/80"
        >
          <Menu className="h-[18px] w-[18px]" />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}
