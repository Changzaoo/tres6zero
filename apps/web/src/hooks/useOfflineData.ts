import { useCallback, useEffect, useState } from 'react';
import { listVisibleLocalPayloads } from '@/offline/localDataStore';
import type { OfflineEntity } from '@/offline/offlineTypes';

export function useOfflineData<TPayload>(entity: OfflineEntity, ownerId?: string) {
  const [items, setItems] = useState<TPayload[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listVisibleLocalPayloads<TPayload>(entity, ownerId));
    } finally {
      setLoading(false);
    }
  }, [entity, ownerId]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return { items, loading, refresh };
}

