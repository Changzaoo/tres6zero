import { API_URL } from '@/config/api';
import { deviceHeaders, getAuthToken, getCachedUser } from '@/services/authService';
import type { AppTemplate } from '@/types';
import type { AppMusic } from '@/types';

const JSON_CACHE_PREFIX = 'six3.mediaJsonCache.';
const JSON_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

export type MediaUploadResult = {
  id: string;
  fileName: string;
  storagePath: string;
  videoUrl?: string;
  imageUrl?: string;
  avatarUrl?: string;
  templateUrl?: string;
  musicUrl?: string;
  publicUrl?: string;
  size: number;
  mimetype: string;
  status?: string;
  createdAt: string;
};

export type SeedTemplatesJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  count: number;
  offset: number;
  musicCount: number;
  animatedCount: number;
  templateUploaded: number;
  animatedUploaded: number;
  musicUploaded: number;
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  error?: string;
};

function authHeader() {
  const token = getAuthToken();
  return token ? `Bearer ${token}` : '';
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function storageGet(key: string) {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be full on some installed browsers.
  }
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function cacheablePathname(path: string) {
  return path.split('?')[0];
}

function isCacheableJson(path: string, options: RequestInit) {
  return (!options.method || options.method.toUpperCase() === 'GET')
    && ['/api/templates/generated', '/api/templates/generated-music'].includes(cacheablePathname(path));
}

function cacheKey(path: string) {
  const scope = getCachedUser()?.uid || 'public';
  return `${JSON_CACHE_PREFIX}${hashString(`${scope}|${path}`)}`;
}

function readJsonCache<T>(path: string) {
  const raw = storageGet(cacheKey(path));
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as { value: T; savedAt: number };
    if (!cached?.savedAt || Date.now() - cached.savedAt > JSON_CACHE_MAX_AGE_MS) return null;
    return cached.value;
  } catch {
    return null;
  }
}

function writeJsonCache<T>(path: string, value: T) {
  storageSet(cacheKey(path), JSON.stringify({ value, savedAt: Date.now() }));
}

function generatedTemplateBaseId(template: AppTemplate) {
  const candidates = [
    template.id,
    template.overlayUrl,
    template.previewUrl,
    template.frameUrl,
    template.animationUrl,
    template.storagePath,
    template.animationStoragePath,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const normalized = candidate.replace(/^animated-/, '');
    const match = /(?:generated|idea)-\d+/.exec(normalized);
    if (match) return match[0];
  }

  return null;
}

function normalizeGeneratedTemplateAssetUrls(template: AppTemplate) {
  const baseId = generatedTemplateBaseId(template);
  if (!baseId) return template;

  const overlayUrl = `${API_URL}/api/templates/render/${encodeURIComponent(baseId)}.png`;
  const animationUrl = template.animationUrl && !/render-motion/i.test(template.animationUrl)
    ? template.animationUrl
    : undefined;

  return {
    ...template,
    previewUrl: overlayUrl,
    overlayUrl,
    frameUrl: overlayUrl,
    animationUrl,
  };
}

function uploadMultipart(path: string, file: File | Blob, onProgress?: (pct: number) => void): Promise<MediaUploadResult> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    const fallbackName = file instanceof File ? file.name : 'capture.webm';
    body.append('file', file, fallbackName);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    const token = authHeader();
    if (token) xhr.setRequestHeader('Authorization', token);
    Object.entries(deviceHeaders()).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onerror = () => reject(new Error('UPLOAD_FAILED'));
    xhr.onload = () => {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(xhr.responseText || '{}');
      } catch {
        payload = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as MediaUploadResult);
        return;
      }
      reject(new Error(String(payload?.error || payload?.code || 'UPLOAD_FAILED')));
    };
    xhr.send(body);
  });
}

async function authedJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cacheable = isCacheableJson(path, options);
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = authHeader();
  if (token) headers.set('Authorization', token);
  Object.entries(deviceHeaders()).forEach(([key, value]) => headers.set(key, value));

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (error) {
    const cached = cacheable ? readJsonCache<T>(path) : null;
    if (cached) return cached;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const cached = cacheable && (response.status === 503 || (isBrowser() && !window.navigator.onLine))
      ? readJsonCache<T>(path)
      : null;
    if (cached) return cached;

    throw new Error(payload?.error || payload?.code || 'REQUEST_FAILED');
  }

  if (cacheable) {
    writeJsonCache(path, payload as T);
  }

  return payload as T;
}

export function uploadVideoToServer(file: File | Blob, onProgress?: (pct: number) => void) {
  return uploadMultipart('/api/upload/video', file, onProgress);
}

export function uploadImageToServer(file: File | Blob, onProgress?: (pct: number) => void) {
  return uploadMultipart('/api/upload/image', file, onProgress);
}

export function uploadAvatarToServer(file: File | Blob, onProgress?: (pct: number) => void) {
  return uploadMultipart('/api/upload/avatar', file, onProgress);
}

export function uploadTemplateToServer(file: File | Blob, onProgress?: (pct: number) => void) {
  return uploadMultipart('/api/upload/template', file, onProgress);
}

export function uploadMusicToServer(file: File | Blob, onProgress?: (pct: number) => void) {
  return uploadMultipart('/api/upload/music', file, onProgress);
}

export async function getGeneratedTemplates() {
  const { templates } = await authedJson<{ templates: AppTemplate[] }>('/api/templates/generated?v=render-v2');
  return templates.map(normalizeGeneratedTemplateAssetUrls);
}

export async function getGeneratedMusic() {
  const { music } = await authedJson<{ music: AppMusic[] }>('/api/templates/generated-music');
  return music;
}

export async function seedGeneratedTemplates(count?: number, animatedCount?: number, musicCount = 72) {
  const { templates, music } = await authedJson<{ templates: AppTemplate[]; music?: AppMusic[] }>('/api/templates/seed-transparent', {
    method: 'POST',
    body: JSON.stringify({ count, animatedCount, musicCount }),
  });
  return { templates, music: music || [] };
}

export async function seedCuratedTemplates() {
  const { templates } = await authedJson<{ templates: AppTemplate[] }>('/api/templates/seed-curated', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return templates;
}

export async function startGeneratedTemplatesSeedJob(count?: number, animatedCount?: number, musicCount = 72) {
  const { job } = await authedJson<{ job: SeedTemplatesJob }>('/api/templates/seed-transparent-job', {
    method: 'POST',
    body: JSON.stringify({ count, animatedCount, musicCount }),
  });
  return job;
}

export async function getGeneratedTemplatesSeedJob(jobId: string) {
  const { job } = await authedJson<{ job: SeedTemplatesJob }>(`/api/templates/seed-transparent-job/${encodeURIComponent(jobId)}?t=${Date.now()}`);
  return job;
}
