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
  templateUrl?: string;
  musicUrl?: string;
  publicUrl?: string;
  size: number;
  mimetype: string;
  status?: string;
  createdAt: string;
};

export type VideoProcessResult = {
  videoId: string;
  status: 'processed' | 'failed';
  outputUrl?: string;
  storagePath?: string;
  effect?: string;
  musicTheme?: string;
  aiRationale?: string;
  error?: string;
  processedAt: string;
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

function isCacheableJson(path: string, options: RequestInit) {
  return (!options.method || options.method.toUpperCase() === 'GET')
    && ['/api/templates/generated', '/api/templates/generated-music'].includes(path);
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
      const payload = JSON.parse(xhr.responseText || '{}');
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
        return;
      }
      reject(new Error(payload?.error || payload?.code || 'UPLOAD_FAILED'));
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

export function uploadTemplateToServer(file: File | Blob, onProgress?: (pct: number) => void) {
  return uploadMultipart('/api/upload/template', file, onProgress);
}

export function uploadMusicToServer(file: File | Blob, onProgress?: (pct: number) => void) {
  return uploadMultipart('/api/upload/music', file, onProgress);
}

export function processVideoOnServer(config: {
  videoId: string;
  inputUrl: string;
  storagePath?: string;
  templateId?: string;
  overlayUrl?: string;
  animationUrl?: string;
  effect?: string;
  effectSegments?: { effect: string; start: number; end: number }[];
  musicTheme?: string;
  musicUrl?: string;
  eventType?: string;
  durationSeconds?: number;
}) {
  return authedJson<VideoProcessResult>('/api/video/process', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function getGeneratedTemplates() {
  const { templates } = await authedJson<{ templates: AppTemplate[] }>('/api/templates/generated');
  return templates;
}

export async function getGeneratedMusic() {
  const { music } = await authedJson<{ music: AppMusic[] }>('/api/templates/generated-music');
  return music;
}

export async function seedGeneratedTemplates(count = 720, animatedCount = 144, musicCount = 72) {
  const { templates, music } = await authedJson<{ templates: AppTemplate[]; music?: AppMusic[] }>('/api/templates/seed-transparent', {
    method: 'POST',
    body: JSON.stringify({ count, animatedCount, musicCount }),
  });
  return { templates, music: music || [] };
}
