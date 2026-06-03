import { getOfflineDb } from './db';
import { createOfflineId, nowIso } from './offlineConfig';
import type { LocalRecord, LocalSyncStatus, OfflineEntity } from './offlineTypes';

export type SaveLocalRecordInput<TPayload> = {
  id?: string;
  remoteId?: string;
  entity: OfflineEntity;
  ownerId?: string;
  payload: TPayload;
  syncStatus?: LocalSyncStatus;
  deletedAt?: string;
  source?: 'local' | 'remote';
  version?: number;
  lastSyncedAt?: string;
};

export function getPayloadId(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const id = (payload as Record<string, unknown>).id;
  return typeof id === 'string' ? id : undefined;
}

export async function saveLocalRecord<TPayload>(input: SaveLocalRecordInput<TPayload>) {
  const db = await getOfflineDb();
  const now = nowIso();
  const id = input.id || input.remoteId || getPayloadId(input.payload) || createOfflineId(input.entity);
  const existing = await db.get('localRecords', id);
  const record: LocalRecord<TPayload> = {
    id,
    remoteId: input.remoteId || existing?.remoteId,
    entity: input.entity,
    ownerId: input.ownerId || existing?.ownerId,
    payload: input.payload,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: input.deletedAt,
    syncStatus: input.syncStatus || 'synced',
    version: input.version || (existing?.version ? existing.version + 1 : 1),
    lastSyncedAt: input.lastSyncedAt,
    source: input.source || 'local',
  };

  await db.put('localRecords', record as LocalRecord);
  return record;
}

export async function saveRemoteRecords<TPayload extends { id: string; ownerId?: string }>(
  entity: OfflineEntity,
  records: TPayload[],
  ownerId?: string
) {
  await Promise.all(records.map((payload) => saveLocalRecord({
    id: payload.id,
    remoteId: payload.id,
    entity,
    ownerId: ownerId || payload.ownerId,
    payload,
    syncStatus: 'synced',
    source: 'remote',
    lastSyncedAt: nowIso(),
  })));
}

export async function getLocalRecord<TPayload = unknown>(entity: OfflineEntity, id: string) {
  const db = await getOfflineDb();
  const direct = await db.get('localRecords', id);
  if (direct?.entity === entity) return direct as LocalRecord<TPayload>;

  const records = await db.getAllFromIndex('localRecords', 'by-remote-id', id);
  return records.find((record) => record.entity === entity) as LocalRecord<TPayload> | undefined;
}

export async function listLocalRecords<TPayload = unknown>(entity: OfflineEntity, ownerId?: string) {
  const db = await getOfflineDb();
  const records = await db.getAllFromIndex('localRecords', 'by-entity', entity);
  return records
    .filter((record) => !ownerId || !record.ownerId || record.ownerId === ownerId)
    .sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || '')) as LocalRecord<TPayload>[];
}

export async function listVisibleLocalPayloads<TPayload = unknown>(entity: OfflineEntity, ownerId?: string) {
  const records = await listLocalRecords<TPayload>(entity, ownerId);
  return records
    .filter((record) => !record.deletedAt && record.syncStatus !== 'pending_delete')
    .map((record) => record.payload);
}

export async function markLocalRecordStatus(
  entity: OfflineEntity,
  id: string,
  syncStatus: LocalSyncStatus,
  errorData?: Partial<LocalRecord>
) {
  const record = await getLocalRecord(entity, id);
  if (!record) return null;

  const updated: LocalRecord = {
    ...record,
    ...errorData,
    syncStatus,
    updatedAt: nowIso(),
  };
  const db = await getOfflineDb();
  await db.put('localRecords', updated);
  return updated;
}

export async function deleteLocalRecord(entity: OfflineEntity, id: string) {
  const record = await getLocalRecord(entity, id);
  if (!record) return;
  const db = await getOfflineDb();
  await db.delete('localRecords', record.id);
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

export async function replaceFilePlaceholderInLocalRecords(fileId: string, replacement: { url?: string; storagePath?: string }) {
  const db = await getOfflineDb();
  const records = await db.getAll('localRecords');
  await Promise.all(records.map(async (record) => {
    const nextPayload = replaceInValue(record.payload, fileId, replacement);
    if (JSON.stringify(nextPayload) === JSON.stringify(record.payload)) return;
    await db.put('localRecords', {
      ...record,
      payload: nextPayload,
      updatedAt: nowIso(),
    });
  }));
}

