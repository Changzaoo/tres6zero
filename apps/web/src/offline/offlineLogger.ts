import { getOfflineDb } from './db';
import { createOfflineId, nowIso, OFFLINE_LOG_LIMIT } from './offlineConfig';
import type { OfflineLogEntry, OfflineLogLevel } from './offlineTypes';

const SENSITIVE_KEYS = /token|authorization|password|senha|secret|apikey|api_key|cookie/i;

function sanitizeData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeData);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEYS.test(key) ? '[redacted]' : sanitizeData(item),
    ])
  );
}

async function trimLogs() {
  const db = await getOfflineDb();
  const logs = await db.getAllFromIndex('logs', 'by-created-at');
  if (logs.length <= OFFLINE_LOG_LIMIT) return;

  const overflow = logs.slice(0, logs.length - OFFLINE_LOG_LIMIT);
  await Promise.all(overflow.map((entry) => db.delete('logs', entry.id)));
}

export async function logOffline(level: OfflineLogLevel, scope: string, message: string, data?: unknown) {
  const entry: OfflineLogEntry = {
    id: createOfflineId('log'),
    level,
    scope,
    message,
    data: data === undefined ? undefined : sanitizeData(data),
    createdAt: nowIso(),
  };

  try {
    const db = await getOfflineDb();
    await db.put('logs', entry);
    trimLogs().catch(() => undefined);
  } catch (error) {
    console.warn('[offline] log failed:', error);
  }
}

export async function getOfflineLogs(limit = 200) {
  const db = await getOfflineDb();
  const logs = await db.getAllFromIndex('logs', 'by-created-at');
  return logs.slice(-limit).reverse();
}

export async function clearOfflineLogs() {
  const db = await getOfflineDb();
  await db.clear('logs');
}

export async function exportOfflineLogsJson() {
  const logs = await getOfflineLogs(OFFLINE_LOG_LIMIT);
  return JSON.stringify({ exportedAt: nowIso(), logs }, null, 2);
}

