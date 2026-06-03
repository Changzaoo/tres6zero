import { offlineCacheKey, readCachedResponse, writeCachedResponse } from './cacheManager';
import { enqueueSyncOperation } from './syncQueue';
import { logOffline } from './offlineLogger';
import type { OfflineEntity, SyncActionType, SyncQueueItem } from './offlineTypes';

export function isNetworkError(error: unknown) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (!(error instanceof Error)) return false;
  return /failed to fetch|networkerror|network error|load failed|offline/i.test(error.message);
}

export async function readOfflineJsonCache<T>(scope: string, path: string) {
  return readCachedResponse<T>(offlineCacheKey(scope, path));
}

export async function writeOfflineJsonCache<T>(scope: string, path: string, value: T, maxAgeMs?: number) {
  return writeCachedResponse({
    key: offlineCacheKey(scope, path),
    scope,
    path,
    value,
    maxAgeMs,
  });
}

export async function queueOfflineJsonMutation<TPayload>(params: {
  type: SyncActionType;
  entity: OfflineEntity;
  entityId: string;
  method: SyncQueueItem['method'];
  endpoint: string;
  payload?: TPayload;
  priority?: number;
  maxAttempts?: number;
}) {
  const item = await enqueueSyncOperation({
    ...params,
    dedupe: true,
  });
  await logOffline('info', 'api', 'Acao guardada neste dispositivo.', {
    entity: params.entity,
    type: params.type,
    endpoint: params.endpoint,
  });
  return item;
}
