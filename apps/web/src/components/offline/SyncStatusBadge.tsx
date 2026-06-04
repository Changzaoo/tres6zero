import { CheckCircle2, Cloud, CloudOff, Loader2, TriangleAlert } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export function SyncStatusBadge() {
  const network = useNetworkStatus();
  const { summary } = useOfflineSync();
  const pending = summary.pending + summary.failed + summary.conflict;

  if (!network.isOnline) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-100">
        <CloudOff className="h-3.5 w-3.5" />
        Aguardando internet
      </span>
    );
  }

  if (summary.isSyncing || summary.running > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-100">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Enviando alterações
      </span>
    );
  }

  if (summary.conflict > 0 || summary.failed > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-100">
        <TriangleAlert className="h-3.5 w-3.5" />
        Precisa de revisão
      </span>
    );
  }

  if (pending > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-100">
        <Cloud className="h-3.5 w-3.5" />
        Pendente
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-100">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Tudo sincronizado
    </span>
  );
}

