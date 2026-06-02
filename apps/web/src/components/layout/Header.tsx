import { useState } from 'react';
import { Search, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const online = useOnlineStatus();
  const { user, hasActiveSubscription } = useAuth();
  const [search, setSearch] = useState('');
  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="relative z-10 hidden h-[68px] shrink-0 items-center gap-4 border-b border-white/[0.08] bg-[#0e1016]/80 px-5 backdrop-blur-2xl lg:flex">
      {title && (
        <h1 className="hidden text-base font-black tracking-[-0.02em] text-white/90 lg:block">{title}</h1>
      )}

      <div className="hidden max-w-xs flex-1 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar eventos, vídeos..."
            className="w-full rounded-full border border-white/[0.08] bg-white/[0.045] py-2 pl-9 pr-4 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] placeholder-white/25 transition-all focus:border-brand-400/50 focus:bg-white/[0.065] focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {!online && (
          <div className="flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/[0.12] px-3 py-1.5 text-xs font-semibold text-yellow-400">
            <WifiOff className="h-3.5 w-3.5" />
            Offline
          </div>
        )}

        <NotificationBell />

        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-brand text-xs font-black text-white ring-1 ring-white/15 shadow-glow">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              : initial}
          </div>
          <div className="hidden min-w-0 xl:block">
            <p className="truncate text-xs font-bold text-white/80 max-w-[10rem]">{user?.name}</p>
            <p className={`font-mono text-[10px] ${hasActiveSubscription ? 'text-emerald-400/80' : 'text-white/30'}`}>
              {hasActiveSubscription ? 'Ativo' : 'Sem assinatura'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
