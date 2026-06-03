import { API_URL } from '@/config/api';
import { apiRequest, deviceHeaders, getAuthToken } from '@/services/authService';
import { createOfflineId, nowIso } from '@/offline/offlineConfig';
import { deleteLocalRecord, getLocalRecord, listVisibleLocalPayloads, saveLocalRecord, saveRemoteRecords } from '@/offline/localDataStore';
import { isNetworkError, queueOfflineJsonMutation } from '@/offline/offlineApiClient';
import { findPendingCreateForEntity, removeQueueItem, updateQueuePayloadForEntity } from '@/offline/syncQueue';
import { logOffline } from '@/offline/offlineLogger';
import type { AppVideo } from '@/types';

type CreateVideoInput = Omit<AppVideo, 'id' | 'createdAt' | 'updatedAt'>;

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function hasOfflineFileReference(value: unknown) {
  return (JSON.stringify(value) || '').includes('offline://file/');
}

function sortVideos(videos: AppVideo[]) {
  return videos.sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
}

async function localVideoPayload(id: string) {
  const record = await getLocalRecord<AppVideo>('video', id);
  return record?.payload;
}

export async function createVideo(data: CreateVideoInput): Promise<AppVideo> {
  const now = nowIso();
  const localId = createOfflineId('local_video');
  const localVideo: AppVideo = {
    ...data,
    id: localId,
    createdAt: now,
    updatedAt: now,
  };

  await saveLocalRecord({
    id: localId,
    entity: 'video',
    ownerId: data.ownerId,
    payload: localVideo,
    syncStatus: 'pending_create',
    source: 'local',
  });

  if (isOnline() && !hasOfflineFileReference(data)) {
    try {
      const { video } = await apiRequest<{ video: AppVideo }>('/api/video', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await saveRemoteRecords('video', [video], video.ownerId);
      await deleteLocalRecord('video', localId);
      return video;
    } catch (error) {
      if (!isNetworkError(error)) {
        await deleteLocalRecord('video', localId);
        throw error;
      }
    }
  }

  await queueOfflineJsonMutation({
    type: 'CREATE',
    entity: 'video',
    entityId: localId,
    method: 'POST',
    endpoint: '/api/video',
    payload: data,
    priority: 50,
  });
  await logOffline('info', 'videos', 'Video salvo neste dispositivo.', { videoId: localId });
  return localVideo;
}

export async function updateVideo(id: string, data: Partial<AppVideo>) {
  const existing = await localVideoPayload(id);
  const updatedLocal = existing ? { ...existing, ...data, id: existing.id, updatedAt: nowIso() } : null;
  const pendingCreate = await findPendingCreateForEntity('video', id);

  if (pendingCreate && updatedLocal) {
    await saveLocalRecord({
      id,
      entity: 'video',
      ownerId: updatedLocal.ownerId,
      payload: updatedLocal,
      syncStatus: 'pending_create',
      source: 'local',
    });
    await updateQueuePayloadForEntity('video', id, {
      ...(pendingCreate.payload as Record<string, unknown>),
      ...data,
    });
    return;
  }

  if (updatedLocal) {
    await saveLocalRecord({
      id,
      remoteId: id.startsWith('local_') ? undefined : id,
      entity: 'video',
      ownerId: updatedLocal.ownerId,
      payload: updatedLocal,
      syncStatus: 'pending_update',
      source: 'local',
    });
  }

  if (isOnline() && !hasOfflineFileReference(data)) {
    try {
      const { video } = await apiRequest<{ video: AppVideo }>(`/api/video/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (video) await saveRemoteRecords('video', [video], video.ownerId);
      return;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  await queueOfflineJsonMutation({
    type: 'UPDATE',
    entity: 'video',
    entityId: id,
    method: 'PUT',
    endpoint: `/api/video/${encodeURIComponent(id)}`,
    payload: data,
    priority: 45,
  });
}

export async function deleteVideo(id: string) {
  const pendingCreate = await findPendingCreateForEntity('video', id);
  if (pendingCreate) {
    await removeQueueItem(pendingCreate.id);
    await deleteLocalRecord('video', id);
    return;
  }

  const existing = await localVideoPayload(id);
  if (existing) {
    await saveLocalRecord({
      id,
      remoteId: id,
      entity: 'video',
      ownerId: existing.ownerId,
      payload: existing,
      syncStatus: 'pending_delete',
      deletedAt: nowIso(),
      source: 'local',
    });
  }

  if (isOnline()) {
    try {
      await apiRequest<{ ok: boolean }>(`/api/video/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await deleteLocalRecord('video', id);
      return;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  await queueOfflineJsonMutation({
    type: 'DELETE',
    entity: 'video',
    entityId: id,
    method: 'DELETE',
    endpoint: `/api/video/${encodeURIComponent(id)}`,
    priority: 40,
  });
}

export async function getVideo(id: string): Promise<AppVideo | null> {
  if (isOnline()) {
    try {
      const headers = new Headers();
      const token = getAuthToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      Object.entries(deviceHeaders()).forEach(([key, value]) => headers.set(key, value));

      const response = await fetch(`${API_URL}/api/video/${encodeURIComponent(id)}`, { headers });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(payload?.error || payload?.code || 'VIDEO_LOAD_FAILED');
      if (payload.video) await saveRemoteRecords('video', [payload.video], payload.video.ownerId);
      return payload.video || null;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  return await localVideoPayload(id) || null;
}

export async function getEventVideos(eventId: string): Promise<AppVideo[]> {
  if (isOnline()) {
    try {
      const response = await fetch(`${API_URL}/api/video/event/${encodeURIComponent(eventId)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || payload?.code || 'VIDEOS_LOAD_FAILED');
      const videos = (payload.videos || []) as AppVideo[];
      await saveRemoteRecords('video', videos);
      return sortVideos(videos);
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  const videos = await listVisibleLocalPayloads<AppVideo>('video');
  return sortVideos(videos.filter((video) => video.eventId === eventId));
}

export async function getUserVideos(ownerId: string): Promise<AppVideo[]> {
  if (isOnline()) {
    try {
      const { videos } = await apiRequest<{ videos: AppVideo[] }>('/api/video');
      await saveRemoteRecords('video', videos, ownerId);
      return sortVideos(await listVisibleLocalPayloads<AppVideo>('video', ownerId));
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  return sortVideos(await listVisibleLocalPayloads<AppVideo>('video', ownerId));
}

export async function incrementVideoStat(id: string, field: 'views' | 'downloads' | 'shares') {
  await fetch(`${API_URL}/api/video/${encodeURIComponent(id)}/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field }),
  }).catch(() => undefined);
}
