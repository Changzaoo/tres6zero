import { getCachedUser } from '@/services/authService';

export type MediaFavoriteType = 'template' | 'music';

export type MediaFavorites = {
  templates: string[];
  music: string[];
};

const FAVORITES_KEY_PREFIX = 'six3.mediaFavorites.';
const FAVORITES_EVENT = 'six3-media-favorites-change';

function isBrowser() {
  return typeof window !== 'undefined';
}

function uniqueIds(ids: unknown) {
  if (!Array.isArray(ids)) return [];
  return Array.from(new Set(ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)));
}

function emptyFavorites(): MediaFavorites {
  return { templates: [], music: [] };
}

function storageKey(ownerId?: string) {
  return `${FAVORITES_KEY_PREFIX}${ownerId || getCachedUser()?.uid || 'public'}`;
}

export function normalizeMediaFavorites(value: unknown): MediaFavorites {
  if (!value || typeof value !== 'object') return emptyFavorites();
  const data = value as Partial<MediaFavorites>;
  return {
    templates: uniqueIds(data.templates),
    music: uniqueIds(data.music),
  };
}

export function getMediaFavorites(ownerId?: string): MediaFavorites {
  if (!isBrowser()) return emptyFavorites();

  try {
    return normalizeMediaFavorites(JSON.parse(window.localStorage.getItem(storageKey(ownerId)) || '{}'));
  } catch {
    return emptyFavorites();
  }
}

export function setMediaFavorites(favorites: MediaFavorites, ownerId?: string) {
  const normalized = normalizeMediaFavorites(favorites);
  if (!isBrowser()) return normalized;

  window.localStorage.setItem(storageKey(ownerId), JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, {
    detail: {
      ownerId: ownerId || getCachedUser()?.uid || 'public',
      favorites: normalized,
    },
  }));
  return normalized;
}

export function toggleMediaFavorite(type: MediaFavoriteType, id: string, ownerId?: string) {
  const current = getMediaFavorites(ownerId);
  const key = type === 'template' ? 'templates' : 'music';
  const active = new Set(current[key]);

  if (active.has(id)) active.delete(id);
  else active.add(id);

  return setMediaFavorites({ ...current, [key]: Array.from(active) }, ownerId);
}

export function isMediaFavorite(type: MediaFavoriteType, id: string, favorites: MediaFavorites) {
  return type === 'template'
    ? favorites.templates.includes(id)
    : favorites.music.includes(id);
}

export function favoriteSet(ids: string[]) {
  return new Set(ids);
}

export function sortFavoritesFirst<T extends { id: string }>(items: T[], favoriteIds: Set<string>) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
    const aFavorite = favoriteIds.has(a.item.id);
    const bFavorite = favoriteIds.has(b.item.id);
    if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
    return a.index - b.index;
  })
    .map(({ item }) => item);
}

export function subscribeMediaFavorites(listener: () => void) {
  if (!isBrowser()) return () => undefined;

  const handler = () => listener();
  window.addEventListener(FAVORITES_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(FAVORITES_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
