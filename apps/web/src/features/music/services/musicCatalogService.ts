import { apiRequest } from '@/services/authService';
import { getGeneratedMusic } from '@/services/serverMediaService';
import { getUserMusic } from '@/services/musicService';
import type { AppMusic } from '@/types';
import { appMusicToTrack, trackToAppMusicFields } from '../adapters';
import type { MusicTrack } from '../types';

export interface MusicCatalogEntry {
  track: MusicTrack;
  raw: AppMusic;
  /** custom = editável pelo admin; generated/public = somente leitura. */
  editable: boolean;
}

/**
 * Carrega o catálogo completo (geradas + customizadas/Firestore) já como
 * MusicTrack. Usado pelo editor (filtrando por fileUrl) e pelo admin.
 */
export async function loadMusicCatalog(ownerId?: string): Promise<MusicCatalogEntry[]> {
  const [generated, custom] = await Promise.all([
    getGeneratedMusic().catch(() => [] as AppMusic[]),
    getUserMusic(ownerId).catch(() => [] as AppMusic[]),
  ]);

  const map = new Map<string, MusicCatalogEntry>();
  for (const raw of generated) {
    map.set(raw.id, { track: appMusicToTrack(raw), raw, editable: false });
  }
  for (const raw of custom) {
    map.set(raw.id, { track: appMusicToTrack(raw), raw, editable: true });
  }
  return [...map.values()];
}

/** Catálogo apenas com faixas que têm arquivo (para uso no editor). */
export async function loadPlayableTracks(ownerId?: string): Promise<MusicTrack[]> {
  const entries = await loadMusicCatalog(ownerId);
  return entries.map((e) => e.track).filter((t) => Boolean(t.fileUrl) && t.isActive);
}

export async function createMusicTrack(track: MusicTrack): Promise<AppMusic> {
  const fields = trackToAppMusicFields(track);
  const { music } = await apiRequest<{ music: AppMusic }>('/api/templates/custom-music', {
    method: 'POST',
    body: JSON.stringify({ ...fields, source: 'custom', category: legacyCategory(track) }),
  });
  return music;
}

export async function updateMusicTrack(id: string, patch: Partial<MusicTrack>): Promise<void> {
  // Converte só os campos presentes (PUT parcial).
  const fields = trackToAppMusicFields({ ...EMPTY_TRACK, ...patch, id } as MusicTrack);
  const body = stripUndefined(fields);
  await apiRequest(`/api/templates/custom-music/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function setMusicActive(id: string, isActive: boolean): Promise<void> {
  await apiRequest(`/api/templates/custom-music/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ isActive }),
  });
}

/** Arquiva (desativa) — não apaga dados/arquivos. */
export async function archiveMusic(id: string): Promise<void> {
  await setMusicActive(id, false);
}

const EMPTY_TRACK: MusicTrack = {
  id: '', title: '', slug: '', category: 'universal', mood: [], energyLevel: 5,
  durationOriginal: 0, availableCuts: [], bestForDurations: [], fileUrl: '',
  licenseType: 'royalty_free_or_owned', source: 'internal_library',
  allowedCommercialUse: true, attributionRequired: false, tags: [],
  isPremium: false, isActive: true, createdAt: '', updatedAt: '',
};

function legacyCategory(track: MusicTrack): string {
  // O schema legado exige uma category de template/ambient. 'ambient' é o coringa seguro.
  return 'ambient';
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
