import { getOfflineDb } from './db';
import { createOfflineId, nowIso, offlineFilePlaceholder, OFFLINE_FILE_SOFT_LIMIT_BYTES } from './offlineConfig';
import { logOffline } from './offlineLogger';
import type { OfflineFileRecord } from './offlineTypes';

function fileNameFor(file: File | Blob) {
  return file instanceof File ? file.name : 'arquivo-offline.bin';
}

export async function offlineFilesTotalBytes() {
  const db = await getOfflineDb();
  const files = await db.getAll('files');
  return files.reduce((total, file) => total + file.size, 0);
}

export async function saveOfflineFile(params: {
  file: File | Blob;
  endpoint: string;
  ownerId?: string;
  previewUrl?: string;
}) {
  const total = await offlineFilesTotalBytes();
  if (total + params.file.size > OFFLINE_FILE_SOFT_LIMIT_BYTES) {
    await logOffline('warn', 'files', 'Armazenamento offline perto do limite.', {
      currentBytes: total,
      nextFileBytes: params.file.size,
    });
  }

  const now = nowIso();
  const id = createOfflineId('file');
  const record: OfflineFileRecord = {
    id,
    ownerId: params.ownerId,
    name: fileNameFor(params.file),
    type: params.file.type || 'application/octet-stream',
    size: params.file.size,
    blob: params.file,
    previewUrl: params.previewUrl,
    syncStatus: 'pending_create',
    createdAt: now,
    updatedAt: now,
    uploadAttempts: 0,
    endpoint: params.endpoint,
  };

  const db = await getOfflineDb();
  await db.put('files', record);
  await logOffline('info', 'files', 'Arquivo salvo neste dispositivo para envio depois.', {
    fileId: id,
    name: record.name,
    size: record.size,
    endpoint: record.endpoint,
  });

  return {
    record,
    placeholder: offlineFilePlaceholder(id),
  };
}

export async function getOfflineFile(id: string) {
  const db = await getOfflineDb();
  return db.get('files', id);
}

export async function updateOfflineFile(id: string, data: Partial<OfflineFileRecord>) {
  const db = await getOfflineDb();
  const record = await db.get('files', id);
  if (!record) return null;
  const updated: OfflineFileRecord = {
    ...record,
    ...data,
    updatedAt: nowIso(),
  };
  await db.put('files', updated);
  return updated;
}

export async function listPendingOfflineFiles() {
  const db = await getOfflineDb();
  const files = await db.getAll('files');
  return files.filter((file) => ['pending_create', 'failed'].includes(file.syncStatus));
}

export async function removeOfflineFile(id: string) {
  const db = await getOfflineDb();
  await db.delete('files', id);
}

