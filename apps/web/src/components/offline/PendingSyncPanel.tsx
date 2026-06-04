import { Download, RefreshCw, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { exportOfflineLogsJson } from '@/offline/offlineLogger';
import { toast } from '@/components/ui/Toast';

function actionLabel(type: string) {
  const labels: Record<string, string> = {
    CREATE: 'Criar',
    UPDATE: 'Atualizar',
    DELETE: 'Excluir',
    UPLOAD: 'Enviar arquivo',
    DOWNLOAD_CACHE: 'Salvar para offline',
    LOGIN_REFRESH: 'Renovar sessao',
    CUSTOM: 'Acao',
  };
  return labels[type] || type;
}

export function PendingSyncPanel() {
  const { items, summary, retry, cancel } = useOfflineSync();
  const [open, setOpen] = useState(false);
  const total = summary.pending + summary.failed + summary.conflict + summary.running;
  const visibleItems = useMemo(() => items.filter((item) => item.status !== 'canceled'), [items]);

  async function exportLogs() {
    const json = await exportOfflineLogsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `six3-logs-offline-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exportados.');
  }

  if (total === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-40 max-w-[calc(100vw-2rem)] md:bottom-5 md:right-5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-100/95 px-4 py-2 text-sm font-medium text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:border-brand-400/35"
        >
          <RefreshCw className="h-4 w-4 text-brand-300" />
          {total} aguardando envio
        </button>
      ) : (
        <div className="w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-surface-100/95 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Itens salvos neste dispositivo</p>
              <p className="text-xs text-white/45">Eles serão enviados quando houver conexão.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-white/45 hover:bg-white/8 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {visibleItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{actionLabel(item.type)} {item.entity}</p>
                    <p className="truncate text-xs text-white/45">{item.status === 'failed' ? item.error || 'Falhou' : 'Aguardando internet'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cancel(item.id)}
                    className="rounded-full p-1.5 text-white/35 hover:bg-white/8 hover:text-rose-200"
                    title="Cancelar envio"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-400"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar agora
            </button>
            <button
              type="button"
              onClick={exportLogs}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/8"
            >
              <Download className="h-4 w-4" />
              Logs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

