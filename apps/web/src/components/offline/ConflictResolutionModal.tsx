import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { resolveOfflineConflict } from '@/offline/conflictResolver';
import type { OfflineConflict } from '@/offline/offlineTypes';

type Props = {
  conflict: OfflineConflict | null;
  onClose: () => void;
  onResolved?: () => void;
};

export function ConflictResolutionModal({ conflict, onClose, onResolved }: Props) {
  if (!conflict) return null;
  const activeConflict = conflict;

  async function choose(resolution: 'local' | 'remote' | 'duplicate' | 'later') {
    await resolveOfflineConflict(activeConflict.id, resolution);
    onResolved?.();
    onClose();
  }

  return (
    <Modal open={Boolean(conflict)} onClose={onClose} title="Precisa de revisão">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-500/10 p-3 text-sm text-amber-50">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Este item foi alterado neste dispositivo e também recebeu mudancas online. Escolha como continuar.</p>
        </div>

        <div className="grid gap-2">
          <button type="button" onClick={() => choose('local')} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400">
            Usar versão deste dispositivo
          </button>
          <button type="button" onClick={() => choose('remote')} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/8">
            Usar versão online
          </button>
          <button type="button" onClick={() => choose('duplicate')} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/8">
            Duplicar item
          </button>
          <button type="button" onClick={() => choose('later')} className="rounded-xl px-4 py-2 text-sm font-semibold text-white/45 hover:bg-white/5 hover:text-white/75">
            Resolver depois
          </button>
        </div>
      </div>
    </Modal>
  );
}
