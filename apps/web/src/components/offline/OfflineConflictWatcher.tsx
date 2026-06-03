import { useEffect, useState } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { listOpenConflicts } from '@/offline/conflictResolver';
import type { OfflineConflict } from '@/offline/offlineTypes';
import { ConflictResolutionModal } from './ConflictResolutionModal';

export function OfflineConflictWatcher() {
  const { summary, refresh } = useOfflineSync();
  const [conflict, setConflict] = useState<OfflineConflict | null>(null);

  useEffect(() => {
    if (summary.conflict === 0 || conflict) return;
    listOpenConflicts()
      .then((items) => setConflict(items[0] || null))
      .catch(() => undefined);
  }, [conflict, summary.conflict]);

  return (
    <ConflictResolutionModal
      conflict={conflict}
      onClose={() => setConflict(null)}
      onResolved={() => refresh()}
    />
  );
}

