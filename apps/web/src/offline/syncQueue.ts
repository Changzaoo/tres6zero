import { getOfflineDb } from './db';
import { createOfflineId, nowIso } from './offlineConfig';
import { logOffline } from './offlineLogger';
import type { OfflineEntity, SyncActionType, SyncQueueItem, SyncQueueStatus } from './offlineTypes';

export type EnqueueSyncInput<TPayload = unknown> = {
  type: SyncActionType;
  entity: OfflineEntity;
  entityId: string;
  method: SyncQueueItem['method'];
  endpoint: string;
  payload?: TPayload;
  fileRef?: string;
  maxAttempts?: number;
  priority?: number;
  dedupe?: boolean;
};

const DEFAULT_MAX_ATTEMPTS = 8;

function requestBackgroundSync() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => {
      const syncRegistration = registration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      };
      return syncRegistration.sync?.register('six3-sync-queue');
    })
    .catch(() => undefined);
}

export async function listQueueItems() {
  const db = await getOfflineDb();
  const items = await db.getAll('syncQueue');
  return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getQueueItem(id: string) {
  const db = await getOfflineDb();
  return db.get('syncQueue', id);
}

export async function findQueueItemsForEntity(entity: OfflineEntity, entityId: string) {
  const db = await getOfflineDb();
  return db.getAllFromIndex('syncQueue', 'by-entity-id', [entity, entityId]);
}

export async function findPendingCreateForEntity(entity: OfflineEntity, entityId: string) {
  const items = await findQueueItemsForEntity(entity, entityId);
  return items.find((item) => item.type === 'CREATE' && ['pending', 'failed'].includes(item.status));
}

export async function enqueueSyncOperation<TPayload = unknown>(input: EnqueueSyncInput<TPayload>) {
  const db = await getOfflineDb();
  const now = nowIso();

  if (input.dedupe !== false) {
    const existing = (await findQueueItemsForEntity(input.entity, input.entityId))
      .find((item) => item.type === input.type && ['pending', 'failed'].includes(item.status));
    if (existing) {
      const updated: SyncQueueItem<TPayload> = {
        ...existing,
        endpoint: input.endpoint,
        method: input.method,
        payload: input.payload,
        fileRef: input.fileRef,
        status: 'pending',
        error: undefined,
        updatedAt: now,
        nextAttemptAt: undefined,
        priority: input.priority ?? existing.priority,
      };
      await db.put('syncQueue', updated as SyncQueueItem);
      requestBackgroundSync();
      return updated;
    }
  }

  const item: SyncQueueItem<TPayload> = {
    id: createOfflineId('sync'),
    type: input.type,
    entity: input.entity,
    entityId: input.entityId,
    method: input.method,
    endpoint: input.endpoint,
    payload: input.payload,
    fileRef: input.fileRef,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    maxAttempts: input.maxAttempts || DEFAULT_MAX_ATTEMPTS,
    status: 'pending',
    priority: input.priority ?? 50,
    clientMutationId: createOfflineId('mutation'),
  };

  await db.put('syncQueue', item as SyncQueueItem);
  requestBackgroundSync();
  await logOffline('info', 'sync', 'Alteracao salva para sincronizar depois.', {
    itemId: item.id,
    type: item.type,
    entity: item.entity,
    endpoint: item.endpoint,
  });
  return item;
}

export async function updateQueueItem(id: string, data: Partial<SyncQueueItem>) {
  const db = await getOfflineDb();
  const current = await db.get('syncQueue', id);
  if (!current) return null;
  const updated: SyncQueueItem = {
    ...current,
    ...data,
    updatedAt: nowIso(),
  };
  await db.put('syncQueue', updated);
  return updated;
}

export async function updateQueuePayloadForEntity(entity: OfflineEntity, entityId: string, payload: unknown) {
  const pendingCreate = await findPendingCreateForEntity(entity, entityId);
  if (!pendingCreate) return null;
  return updateQueueItem(pendingCreate.id, { payload, status: 'pending', error: undefined });
}

export async function removeQueueItem(id: string) {
  const db = await getOfflineDb();
  await db.delete('syncQueue', id);
}

export async function cancelQueueItem(id: string) {
  await updateQueueItem(id, { status: 'canceled', error: undefined });
  await logOffline('info', 'sync', 'Item pendente cancelado.', { itemId: id });
}

export async function markQueueItemStatus(id: string, status: SyncQueueStatus, error?: string) {
  return updateQueueItem(id, { status, error });
}

export async function getRunnableQueueItems() {
  const db = await getOfflineDb();
  const items = await db.getAll('syncQueue');
  const now = Date.now();
  return items
    .filter((item) => ['pending', 'failed'].includes(item.status))
    .filter((item) => !item.nextAttemptAt || Date.parse(item.nextAttemptAt) <= now)
    .sort((a, b) => b.priority - a.priority || Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export async function queueSummary() {
  const items = await listQueueItems();
  return items.reduce(
    (summary, item) => {
      summary[item.status] += 1;
      return summary;
    },
    { pending: 0, running: 0, synced: 0, failed: 0, conflict: 0, canceled: 0 }
  );
}

function replaceInValue(value: unknown, fileId: string, replacement: { url?: string; storagePath?: string }, keyHint = ''): unknown {
  if (Array.isArray(value)) return value.map((item) => replaceInValue(item, fileId, replacement, keyHint));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        replaceInValue(item, fileId, replacement, key),
      ])
    );
  }

  if (value !== `offline://file/${fileId}`) return value;
  if (/storagepath/i.test(keyHint)) return replacement.storagePath || replacement.url || value;
  if (/url|avatar|cover|logo|media/i.test(keyHint)) return replacement.url || replacement.storagePath || value;
  return replacement.url || replacement.storagePath || value;
}

export async function replaceFilePlaceholderInQueue(fileId: string, replacement: { url?: string; storagePath?: string }) {
  const db = await getOfflineDb();
  const items = await db.getAll('syncQueue');
  await Promise.all(items.map(async (item) => {
    const nextPayload = replaceInValue(item.payload, fileId, replacement);
    if (JSON.stringify(nextPayload) === JSON.stringify(item.payload)) return;
    await db.put('syncQueue', {
      ...item,
      payload: nextPayload,
      updatedAt: nowIso(),
    });
  }));
}
