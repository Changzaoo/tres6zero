import type { AppMusic } from '@/types';
import { categoryProfile, musicCategoryForTemplate } from './categoryMap';
import { VIDEO_DURATIONS } from './types';
import type { MusicCategory, MusicLicenseType, MusicSource, MusicTrack, VideoDuration } from './types';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g'), '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toDurations(values: number[] | undefined, fallback: VideoDuration[]): VideoDuration[] {
  if (!values || !values.length) return fallback;
  const valid = values.filter((v): v is VideoDuration => (VIDEO_DURATIONS as readonly number[]).includes(v));
  return valid.length ? valid : fallback;
}

function toCuts(cuts: Record<string, string> | undefined): Partial<Record<VideoDuration, string>> | undefined {
  if (!cuts) return undefined;
  const out: Partial<Record<VideoDuration, string>> = {};
  for (const [key, url] of Object.entries(cuts)) {
    const num = Number(key) as VideoDuration;
    if ((VIDEO_DURATIONS as readonly number[]).includes(num) && url) out[num] = url;
  }
  return out;
}

function inferSource(music: AppMusic): MusicSource {
  if (music.providerId) return 'licensed_import';
  if (/suno|ia|ai/i.test(music.library || '')) return 'ai_generated';
  if (music.source === 'generated') return 'public_library';
  return 'internal_library';
}

function inferLicenseType(music: AppMusic): MusicLicenseType {
  if (music.licenseType) return music.licenseType as MusicLicenseType;
  if (music.providerId) return 'subscription_licensed';
  if (/suno|ia|ai/i.test(music.library || '')) return 'ai_generated';
  if (/public|cc0|domain/i.test(music.licenseName || '')) return 'public_domain';
  return 'royalty_free_or_owned';
}

/**
 * Converte um AppMusic legado (Firestore) em MusicTrack rico, preenchendo
 * campos ausentes a partir do perfil da categoria. Não quebra dados antigos.
 */
export function appMusicToTrack(music: AppMusic): MusicTrack {
  const category: MusicCategory = (music.musicCategory as MusicCategory) || musicCategoryForTemplate(music.category);
  const profile = categoryProfile(category);
  const fileUrl = music.musicUrl || '';

  return {
    id: music.id,
    title: music.name,
    slug: music.slug || slugify(music.name || music.id),
    category,
    subcategory: music.subcategory || music.theme,
    mood: music.mood && music.mood.length ? music.mood : profile.mood,
    energyLevel: typeof music.energyLevel === 'number' ? music.energyLevel : profile.energyLevel,
    bpm: music.bpm,
    durationOriginal: music.durationOriginal ?? music.duration ?? 60,
    availableCuts: toDurations(music.availableCuts, [...VIDEO_DURATIONS]),
    bestForDurations: toDurations(music.bestForDurations, profile.bestForDurations),
    fileUrl,
    previewUrl: music.previewUrl || fileUrl || undefined,
    cuts: toCuts(music.cuts),
    waveformUrl: music.waveformUrl,
    licenseType: inferLicenseType(music),
    licenseDocumentUrl: music.licenseUrl || music.licenseProofUrl,
    source: inferSource(music),
    allowedCommercialUse: music.allowedCommercialUse ?? music.licenseStatus !== 'blocked',
    attributionRequired: music.attributionRequired ?? music.licenseStatus === 'requires_attribution',
    attributionText: music.attribution,
    tags: music.tags && music.tags.length ? music.tags : profile.tags,
    isPremium: music.isPremium ?? false,
    isActive: music.isActive,
    createdAt: music.createdAt,
    updatedAt: music.updatedAt,
  };
}

/** Converte vários AppMusic, ignorando entradas sem arquivo quando exigido. */
export function appMusicListToTracks(list: AppMusic[], opts?: { requireFile?: boolean }): MusicTrack[] {
  const tracks = list.map(appMusicToTrack);
  return opts?.requireFile ? tracks.filter((t) => Boolean(t.fileUrl)) : tracks;
}

/**
 * Campos estendidos para persistir um MusicTrack no documento AppMusic do
 * Firestore (usado pelo admin ao salvar metadados). Mantém compatibilidade
 * preenchendo os campos legados (name/category/musicUrl/duration).
 */
export function trackToAppMusicFields(track: MusicTrack): Partial<AppMusic> {
  return {
    name: track.title,
    slug: track.slug,
    musicCategory: track.category,
    subcategory: track.subcategory,
    mood: track.mood,
    energyLevel: track.energyLevel,
    bpm: track.bpm,
    duration: track.durationOriginal,
    durationOriginal: track.durationOriginal,
    availableCuts: track.availableCuts,
    bestForDurations: track.bestForDurations,
    musicUrl: track.fileUrl,
    previewUrl: track.previewUrl,
    cuts: track.cuts as Record<string, string> | undefined,
    waveformUrl: track.waveformUrl,
    licenseType: track.licenseType,
    licenseUrl: track.licenseDocumentUrl,
    allowedCommercialUse: track.allowedCommercialUse,
    attributionRequired: track.attributionRequired,
    attribution: track.attributionText,
    tags: track.tags,
    isPremium: track.isPremium,
    isActive: track.isActive,
    theme: track.subcategory || track.category,
  };
}
