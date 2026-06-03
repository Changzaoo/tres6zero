import { getOfflineDb } from './db';
import { createOfflineId, nowIso } from './offlineConfig';
import { logOffline } from './offlineLogger';
import type { ConflictResolutionChoice, OfflineConflict, OfflineEntity } from './offlineTypes';

export async function createOfflineConflict(params: {
  entity: OfflineEntity;
  entityId: string;
  localValue: unknown;
  remoteValue?: unknown;
  reason: string;
}) {
  const conflict: OfflineConflict = {
    id: createOfflineId('conflict'),
    entity: params.entity,
    entityId: params.entityId,
    localValue: params.localValue,
    remoteValue: params.remoteValue,
    reason: params.reason,
    status: 'open',
    createdAt: nowIso(),
  };

  const db = await getOfflineDb();
  await db.put('conflicts', conflict);
  await logOffline('warn', 'conflict', 'Item precisa de revisao antes de sincronizar.', {
    conflictId: conflict.id,
    entity: conflict.entity,
    entityId: conflict.entityId,
    reason: conflict.reason,
  });
  return conflict;
}

export async function listOpenConflicts() {
  const db = await getOfflineDb();
  return db.getAllFromIndex('conflicts', 'by-status', 'open');
}

export async function resolveOfflineConflict(id: string, resolution: ConflictResolutionChoice) {
  const db = await getOfflineDb();
  const conflict = await db.get('conflicts', id);
  if (!conflict) return null;
  const updated: OfflineConflict = {
    ...conflict,
    status: resolution === 'later' ? 'open' : 'resolved',
    resolution,
    resolvedAt: resolution === 'later' ? undefined : nowIso(),
  };
  await db.put('conflicts', updated);
  return updated;
}

export function isConflictResponse(status: number, payload: unknown) {
  if (status === 409 || status === 412) return true;
  if (!payload || typeof payload !== 'object') return false;
  const code = (payload as Record<string, unknown>).code || (payload as Record<string, unknown>).error;
  return typeof code === 'string' && /conflict|version/i.test(code);
}

