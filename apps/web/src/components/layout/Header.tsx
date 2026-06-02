import { useState } from 'react';
import { Search, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const online = useOnlineStatus();
  const [search, setSearch] = useState('');

  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center gap-4 border-b border-white/[0.08] bg-[#0e1016]/80 px-4 backdrop-blur-2xl">
      {title && <h1 className="hidden text-lg font-semibold text-white/90 lg:block">{title}</h1>}

      <div className="hidden max-w-sm flex-1 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar eventos, vídeos..."
            className="w-full rounded-full border border-white/[0.08] bg-white/[0.055] py-2 pl-9 pr-4 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder-white/30 transition-all focus:border-brand-400/50 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {!online && (
          <div className="flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/15 px-3 py-1.5 text-xs text-yellow-400">
            <WifiOff className="h-3.5 w-3.5" />
            <span>Offline</span>
          </div>
        )}
      </div>
    </header>
  );
}
