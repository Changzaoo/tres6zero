import { API_URL } from '@/config/api';
import { apiRequest, deviceHeaders, getAuthToken } from '@/services/authService';
import type { AppVideo } from '@/types';

export async function createVideo(data: Omit<AppVideo, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppVideo> {
  const { video } = await apiRequest<{ video: AppVideo }>('/api/video', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return video;
}

export async function updateVideo(id: string, data: Partial<AppVideo>) {
  await apiRequest<{ video: AppVideo }>(`/api/video/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getVideo(id: string): Promise<AppVideo | null> {
  const headers = new Headers();
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  Object.entries(deviceHeaders()).forEach(([key, value]) => headers.set(key, value));

  const response = await fetch(`${API_URL}/api/video/${encodeURIComponent(id)}`, { headers });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(payload?.error || payload?.code || 'VIDEO_LOAD_FAILED');
  return payload.video || null;
}

export async function getEventVideos(eventId: string): Promise<AppVideo[]> {
  const response = await fetch(`${API_URL}/api/video/event/${encodeURIComponent(eventId)}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || payload?.code || 'VIDEOS_LOAD_FAILED');
  return payload.videos || [];
}

export async function getUserVideos(_ownerId: string): Promise<AppVideo[]> {
  const { videos } = await apiRequest<{ videos: AppVideo[] }>('/api/video');
  return videos;
}

export async function incrementVideoStat(id: string, field: 'views' | 'downloads' | 'shares') {
  await fetch(`${API_URL}/api/video/${encodeURIComponent(id)}/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field }),
  }).catch(() => undefined);
}
