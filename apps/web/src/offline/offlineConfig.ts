export const OFFLINE_DB_NAME = 'six3-offline';
export const OFFLINE_DB_VERSION = 1;
export const OFFLINE_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;
export const OFFLINE_LOG_LIMIT = 600;
export const OFFLINE_QUEUE_MAX_ATTEMPTS = 8;
export const OFFLINE_SYNC_INTERVAL_MS = 30_000;
export const OFFLINE_FILE_SOFT_LIMIT_BYTES = 350 * 1024 * 1024;

export const OFFLINE_FILE_PLACEHOLDER_PREFIX = 'offline://file/';

export function nowIso() {
  return new Date().toISOString();
}

export function createOfflineId(prefix = 'local') {
  const cryptoId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${prefix}_${cryptoId}`;
}

export function offlineFilePlaceholder(fileId: string) {
  return `${OFFLINE_FILE_PLACEHOLDER_PREFIX}${fileId}`;
}

export function isOfflineFilePlaceholder(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(OFFLINE_FILE_PLACEHOLDER_PREFIX);
}

export function fileIdFromPlaceholder(value: string) {
  return value.slice(OFFLINE_FILE_PLACEHOLDER_PREFIX.length);
}

