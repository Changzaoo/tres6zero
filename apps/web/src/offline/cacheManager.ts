import { getOfflineDb } from './db';
import { createOfflineId, OFFLINE_CACHE_MAX_AGE_MS } from './offlineConfig';
import type { CachedResponse } from './offlineTypes';

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function offlineCacheKey(scope: string, path: string) {
  return `cache_${hashString(`${scope}|${path}`)}`;
}

export async function readCachedResponse<T>(key: string): Promise<T | null> {
  try {
    const db = await getOfflineDb();
    const cached = await db.get('responseCache', key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      await db.delete('responseCache', key);
      return null;
    }
    return cached.value as T;
  } catch {
    return null;
  }
}

export async function writeCachedResponse<T>(params: {
  key?: string;
  scope: string;
  path: string;
  value: T;
  maxAgeMs?: number;
}) {
  try {
    const db = await getOfflineDb();
    const savedAt = Date.now();
    const entry: CachedResponse<T> = {
      key: params.key || createOfflineId('cache'),
      scope: params.scope,
      path: params.path,
      value: params.value,
      savedAt,
      expiresAt: savedAt + (params.maxAgeMs || OFFLINE_CACHE_MAX_AGE_MS),
    };
    await db.put('responseCache', entry);
    return entry;
  } catch {
    return null;
  }
}

export async function removeExpiredCachedResponses() {
  const db = await getOfflineDb();
  const all = await db.getAll('responseCache');
  await Promise.all(all.filter((entry) => Date.now() > entry.expiresAt).map((entry) => db.delete('responseCache', entry.key)));
}

