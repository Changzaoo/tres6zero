import { API_URL } from '@/config/api';
import { createOfflineConflict, isConflictResponse } from './conflictResolver';
import { getOfflineFile, removeOfflineFile, updateOfflineFile } from './fileOfflineStore';
import { deleteLocalRecord, replaceFilePlaceholderInLocalRecords, saveLocalRecord } from './localDataStore';
import { nowIso } from './offlineConfig';
import { logOffline } from './offlineLogger';
import {
  getRunnableQueueItems,
  getQueueItem,
  listQueueItems,
  markQueueItemStatus,
  queueSummary,
  removeQueueItem,
  replaceFilePlaceholderInQueue,
  updateQueueItem,
} from './syncQueue';
import type { OfflineEntity, SyncQueueItem, SyncSummary } from './offlineTypes';

type HeaderProvider = () => HeadersInit;
type Listener = (summary: SyncSummary) => void;

type SyncEngineConfig = {
  baseUrl?: string;
  getHeaders?: HeaderProvider;
};

const listeners = new Set<Listener>();
let config: SyncEngineConfig = { baseUrl: API_URL };
let syncing = false;
let timer: number | undefined;
let lastSyncedAt: string | undefined;
let lastError: string | undefined;

function emit(summary: SyncSummary) {
  listeners.forEach((listener) => listener(summary));
}

export async function getSyncSummary(): Promise<SyncSummary> {
  const summary = await queueSummary();
  return {
    pending: summary.pending,
    running: summary.running,
    failed: summary.failed,
    conflict: summary.conflict,
    canceled: summary.canceled,
    isSyncing: syncing,
    lastSyncedAt,
    lastError,
  };
}

export async function refreshSyncSummary() {
  const summary = await getSyncSummary();
  emit(summary);
  return summary;
}

export function subscribeSyncSummary(listener: Listener) {
  listeners.add(listener);
  refreshSyncSummary().catch(() => undefined);
  return () => {
    listeners.delete(listener);
  };
}

export function configureOfflineSync(nextConfig: SyncEngineConfig) {
  config = { ...config, ...nextConfig };
}

function absoluteUrl(endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${(config.baseUrl || API_URL).replace(/\/+$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

function nextAttemptAt(attempts: number) {
  const delayMs = Math.min(1000 * 60 * 10, 1000 * 2 ** Math.max(0, attempts));
  return new Date(Date.now() + delayMs).toISOString();
}

function remotePayloadFor(item: SyncQueueItem, payload: unknown) {
  if (!payload || typeof payload !== 'object') return payload;
  const key = item.entity === 'event' ? 'event'
    : item.entity === 'video' ? 'video'
      : item.entity === 'template' ? 'template'
        : item.entity === 'music' ? 'music'
          : undefined;
  return key ? (payload as Record<string, unknown>)[key] || payload : payload;
}

function remoteIdFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const id = (payload as Record<string, unknown>).id;
  return typeof id === 'string' ? id : undefined;
}

function ownerIdFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const ownerId = (payload as Record<string, unknown>).ownerId;
  return typeof ownerId === 'string' ? ownerId : undefined;
}

function uploadUrlFromResult(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const data = payload as Record<string, unknown>;
  const url = data.videoUrl || data.imageUrl || data.avatarUrl || data.templateUrl || data.musicUrl || data.publicUrl;
  return typeof url === 'string' ? url : undefined;
}

function storagePathFromResult(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const storagePath = (payload as Record<string, unknown>).storagePath;
  return typeof storagePath === 'string' ? storagePath : undefined;
}

async function sendJson(item: SyncQueueItem) {
  const headers = new Headers(config.getHeaders?.());
  headers.set('Content-Type', 'application/json');
  headers.set('X-SIX3-Client-Mutation-ID', item.clientMutationId);

  const response = await fetch(absoluteUrl(item.endpoint), {
    method: item.method,
    headers,
    body: item.method === 'DELETE' ? undefined : JSON.stringify(item.payload || {}),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sendUpload(item: SyncQueueItem) {
  if (!item.fileRef) throw new Error('OFFLINE_FILE_REF_MISSING');
  const file = await getOfflineFile(item.fileRef);
  if (!file) throw new Error('OFFLINE_FILE_NOT_FOUND');

  await updateOfflineFile(file.id, { syncStatus: 'pending_update', uploadAttempts: file.uploadAttempts + 1, error: undefined });

  const form = new FormData();
  form.append('file', file.blob, file.name);

  const headers = new Headers(config.getHeaders?.());
  headers.set('X-SIX3-Client-Mutation-ID', item.clientMutationId);

  const response = await fetch(absoluteUrl(item.endpoint), {
    method: 'POST',
    headers,
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function applySuccessfulMutation(item: SyncQueueItem, payload: unknown) {
  if (item.type === 'UPLOAD' && item.fileRef) {
    const remoteUrl = uploadUrlFromResult(payload);
    const storagePath = storagePathFromResult(payload);
    await updateOfflineFile(item.fileRef, {
      remoteUrl,
      storagePath,
      syncStatus: 'synced',
      error: undefined,
    });
    await replaceFilePlaceholderInLocalRecords(item.fileRef, { url: remoteUrl, storagePath });
    await replaceFilePlaceholderInQueue(item.fileRef, { url: remoteUrl, storagePath });
    await removeOfflineFile(item.fileRef);
    return;
  }

  if (item.type === 'DELETE') {
    await deleteLocalRecord(item.entity, item.entityId);
    return;
  }

  const remotePayload = remotePayloadFor(item, payload);
  const remoteId = remoteIdFromPayload(remotePayload);
  if (remoteId && ['event', 'video', 'template', 'music'].includes(item.entity)) {
    await saveLocalRecord({
      id: remoteId,
      remoteId,
      entity: item.entity as OfflineEntity,
      ownerId: ownerIdFromPayload(remotePayload),
      payload: remotePayload,
      syncStatus: 'synced',
      source: 'remote',
      lastSyncedAt: nowIso(),
    });

    if (remoteId !== item.entityId && item.entityId.startsWith('local_')) {
      await deleteLocalRecord(item.entity, item.entityId);
    }
  }
}

async function processItem(item: SyncQueueItem) {
  await updateQueueItem(item.id, {
    status: 'running',
    attempts: item.attempts + 1,
    lastAttemptAt: nowIso(),
    error: undefined,
  });
  await refreshSyncSummary();

  const { response, payload } = item.type === 'UPLOAD'
    ? await sendUpload(item)
    : await sendJson(item);

  if (!response.ok) {
    if (isConflictResponse(response.status, payload)) {
      await createOfflineConflict({
        entity: item.entity,
        entityId: item.entityId,
        localValue: item.payload,
        remoteValue: payload,
        reason: `Resposta ${response.status} do servidor`,
      });
      await markQueueItemStatus(item.id, 'conflict', `HTTP_${response.status}`);
      return;
    }

    throw new Error(String((payload as Record<string, unknown>)?.error || (payload as Record<string, unknown>)?.code || `HTTP_${response.status}`));
  }

  await applySuccessfulMutation(item, payload);
  await removeQueueItem(item.id);
  lastSyncedAt = nowIso();
  await logOffline('info', 'sync', 'Item sincronizado.', {
    itemId: item.id,
    type: item.type,
    entity: item.entity,
  });
}

export async function runOfflineSync() {
  if (syncing || typeof navigator !== 'undefined' && !navigator.onLine) {
    return getSyncSummary();
  }

  syncing = true;
  lastError = undefined;
  await refreshSyncSummary();

  try {
    const items = await getRunnableQueueItems();
    if (items.length) {
      await logOffline('info', 'sync', 'Sincronização iniciada.', { count: items.length });
    }

    for (const item of items) {
      try {
        const latestItem = await getQueueItem(item.id);
        if (!latestItem || !['pending', 'failed'].includes(latestItem.status)) continue;
        await processItem(latestItem);
      } catch (error) {
        const attempts = item.attempts + 1;
        const message = error instanceof Error ? error.message : 'SYNC_FAILED';
        const status = attempts >= item.maxAttempts ? 'failed' : 'pending';
        await updateQueueItem(item.id, {
          status,
          attempts,
          error: message,
          nextAttemptAt: status === 'pending' ? nextAttemptAt(attempts) : undefined,
        });
        lastError = message;
        await logOffline(status === 'failed' ? 'error' : 'warn', 'sync', 'Sincronização falhou.', {
          itemId: item.id,
          attempts,
          error: message,
        });
      }
    }
  } finally {
    syncing = false;
    await refreshSyncSummary();
  }

  return getSyncSummary();
}

export function startOfflineSyncLoop(intervalMs = 30_000) {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    runOfflineSync().catch(() => undefined);
  });

  if (timer) window.clearInterval(timer);
  timer = window.setInterval(() => {
    if (navigator.onLine) runOfflineSync().catch(() => undefined);
  }, intervalMs);

  window.setTimeout(() => {
    if (navigator.onLine) runOfflineSync().catch(() => undefined);
  }, 2500);
}

export async function pendingSyncItemsForUi(limit = 30) {
  const items = await listQueueItems();
  return items.filter((item) => item.status !== 'synced').slice(0, limit);
}
