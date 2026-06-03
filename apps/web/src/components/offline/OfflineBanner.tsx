import { CloudOff, Loader2, Wifi } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { SyncStatusBadge } from './SyncStatusBadge';

export function OfflineBanner() {
  const network = useNetworkStatus();
  const { summary } = useOfflineSync();

  if (!network.isOnline) {
    return (
      <div className="relative z-20 border-b border-amber-300/15 bg-amber-500/10 px-4 py-2 text-amber-50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <CloudOff className="h-4 w-4 shrink-0" />
            <span className="truncate">Voce esta offline. Suas alteracoes serao salvas neste dispositivo.</span>
          </span>
          <SyncStatusBadge />
        </div>
      </div>
    );
  }

  if (network.isReconnecting || summary.isSyncing || summary.running > 0) {
    return (
      <div className="relative z-20 border-b border-cyan-300/15 bg-cyan-500/10 px-4 py-2 text-cyan-50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span className="truncate">Conexao restaurada. Sincronizando alteracoes...</span>
          </span>
          <SyncStatusBadge />
        </div>
      </div>
    );
  }

  if (network.wasOffline && summary.pending === 0 && summary.failed === 0 && summary.conflict === 0) {
    return (
      <div className="relative z-20 border-b border-emerald-300/15 bg-emerald-500/10 px-4 py-2 text-emerald-50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <Wifi className="h-4 w-4 shrink-0" />
            <span className="truncate">Tudo sincronizado.</span>
          </span>
          <SyncStatusBadge />
        </div>
      </div>
    );
  }

  if (summary.failed > 0 || summary.conflict > 0) {
    return (
      <div className="relative z-20 border-b border-rose-300/15 bg-rose-500/10 px-4 py-2 text-rose-50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-sm">
          <span className="truncate">Alguns itens precisam de atencao.</span>
          <SyncStatusBadge />
        </div>
      </div>
    );
  }

  return null;
}

