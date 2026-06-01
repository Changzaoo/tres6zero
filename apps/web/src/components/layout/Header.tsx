import { useState } from 'react';
import { Menu, Bell, Search, Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const online = useOnlineStatus();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  return (
    <header className="h-16 border-b border-white/[0.08] bg-surface-100/80 backdrop-blur-xl flex items-center px-4 gap-4 shrink-0">
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-2xl hover:bg-white/[0.06] text-white/60 hover:text-white transition-colors">
        <Menu className="w-5 h-5" />
      </button>

      {title && <h1 className="hidden lg:block text-lg font-semibold text-white/90">{title}</h1>}

      <div className="flex-1 max-w-sm hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar eventos, vídeos..."
            className="w-full bg-white/[0.055] border border-white/[0.08] rounded-full pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 transition-all" />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {!online && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/20 text-yellow-400 text-xs">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline</span>
          </div>
        )}
        <button className="p-2 rounded-2xl hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white">
          {user?.name?.charAt(0).toUpperCase() || '?'}
        </div>
      </div>
    </header>
  );
}
