import { useCallback, useEffect, useState } from 'react';
import { cancelQueueItem } from '@/offline/syncQueue';
import {
  pendingSyncItemsForUi,
  refreshSyncSummary,
  runOfflineSync,
  subscribeSyncSummary,
} from '@/offline/syncEngine';
import type { SyncQueueItem, SyncSummary } from '@/offline/offlineTypes';

const initialSummary: SyncSummary = {
  pending: 0,
  running: 0,
  failed: 0,
  conflict: 0,
  canceled: 0,
  isSyncing: false,
};

export function useOfflineSync() {
  const [summary, setSummary] = useState<SyncSummary>(initialSummary);
  const [items, setItems] = useState<SyncQueueItem[]>([]);

  const refresh = useCallback(async () => {
    const [nextSummary, nextItems] = await Promise.all([
      refreshSyncSummary(),
      pendingSyncItemsForUi(),
    ]);
    setSummary(nextSummary);
    setItems(nextItems);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSyncSummary((next) => {
      setSummary(next);
      pendingSyncItemsForUi().then(setItems).catch(() => undefined);
    });
    refresh().catch(() => undefined);
    return unsubscribe;
  }, [refresh]);

  const retry = useCallback(async () => {
    await runOfflineSync();
    await refresh();
  }, [refresh]);

  const cancel = useCallback(async (id: string) => {
    await cancelQueueItem(id);
    await refresh();
  }, [refresh]);

  return {
    summary,
    items,
    retry,
    cancel,
    refresh,
  };
}

