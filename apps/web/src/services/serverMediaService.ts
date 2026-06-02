import { API_URL } from '@/config/api';
import { getAuthToken } from '@/services/authService';
import type { AppTemplate } from '@/types';

export type MediaUploadResult = {
  id: string;
  fileName: string;
  storagePath: string;
  videoUrl?: string;
  imageUrl?: string;
  templateUrl?: string;
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

function uploadMultipart(path: string, file: File | Blob, onProgress?: (pct: number) => void): Promise<MediaUploadResult> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    const fallbackName = file instanceof File ? file.name : 'capture.webm';
    body.append('file', file, fallbackName);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    const token = authHeader();
    if (token) xhr.setRequestHeader('Authorization', token);
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
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = authHeader();
  if (token) headers.set('Authorization', token);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || payload?.code || 'REQUEST_FAILED');
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

export function processVideoOnServer(config: {
  videoId: string;
  inputUrl: string;
  storagePath?: string;
  templateId?: string;
  overlayUrl?: string;
  effect?: string;
  musicTheme?: string;
  eventType?: string;
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

export async function seedGeneratedTemplates(count = 216) {
  const { templates } = await authedJson<{ templates: AppTemplate[] }>('/api/templates/seed-transparent', {
    method: 'POST',
    body: JSON.stringify({ count }),
  });
  return templates;
}
