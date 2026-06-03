import { apiRequest } from '@/services/authService';
import { createOfflineId, nowIso } from '@/offline/offlineConfig';
import { deleteLocalRecord, getLocalRecord, listVisibleLocalPayloads, saveLocalRecord, saveRemoteRecords } from '@/offline/localDataStore';
import { isNetworkError, queueOfflineJsonMutation } from '@/offline/offlineApiClient';
import { findPendingCreateForEntity, removeQueueItem, updateQueuePayloadForEntity } from '@/offline/syncQueue';
import { logOffline } from '@/offline/offlineLogger';
import type { AppEvent } from '@/types';

type CreateEventInput = Omit<AppEvent, 'id' | 'slug' | 'createdAt' | 'updatedAt'>;

function slugifyLocal(text: string) {
  return `${text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'evento'}-${Date.now().toString(36)}`;
}

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function hasOfflineFileReference(value: unknown) {
  return (JSON.stringify(value) || '').includes('offline://file/');
}

function sortEvents(events: AppEvent[]) {
  return events.sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
}

async function localEventPayload(id: string) {
  const record = await getLocalRecord<AppEvent>('event', id);
  return record?.payload;
}

export async function createEvent(ownerId: string, data: CreateEventInput): Promise<AppEvent> {
  const now = nowIso();
  const localId = createOfflineId('local_event');
  const localEvent: AppEvent = {
    ...data,
    id: localId,
    ownerId,
    slug: slugifyLocal(data.name),
    createdAt: now,
    updatedAt: now,
  };

  await saveLocalRecord({
    id: localId,
    entity: 'event',
    ownerId,
    payload: localEvent,
    syncStatus: 'pending_create',
    source: 'local',
  });

  if (isOnline() && !hasOfflineFileReference(data)) {
    try {
      const { event } = await apiRequest<{ event: AppEvent }>('/api/events', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await saveRemoteRecords('event', [event], ownerId);
      await deleteLocalRecord('event', localId);
      return event;
    } catch (error) {
      if (!isNetworkError(error)) {
        await deleteLocalRecord('event', localId);
        throw error;
      }
    }
  }

  await queueOfflineJsonMutation({
    type: 'CREATE',
    entity: 'event',
    entityId: localId,
    method: 'POST',
    endpoint: '/api/events',
    payload: data,
    priority: 50,
  });
  await logOffline('info', 'events', 'Evento criado offline.', { eventId: localId });
  return localEvent;
}

export async function updateEvent(id: string, data: Partial<AppEvent>) {
  const existing = await localEventPayload(id);
  const current = existing || await getEvent(id);
  const updatedLocal = current ? { ...current, ...data, id: current.id, updatedAt: nowIso() } : null;

  const pendingCreate = await findPendingCreateForEntity('event', id);
  if (pendingCreate && updatedLocal) {
    await saveLocalRecord({
      id,
      entity: 'event',
      ownerId: updatedLocal.ownerId,
      payload: updatedLocal,
      syncStatus: 'pending_create',
      source: 'local',
    });
    await updateQueuePayloadForEntity('event', id, {
      ...(pendingCreate.payload as Record<string, unknown>),
      ...data,
    });
    return updatedLocal;
  }

  if (updatedLocal) {
    await saveLocalRecord({
      id,
      remoteId: id.startsWith('local_') ? undefined : id,
      entity: 'event',
      ownerId: updatedLocal.ownerId,
      payload: updatedLocal,
      syncStatus: 'pending_update',
      source: 'local',
    });
  }

  if (isOnline() && !hasOfflineFileReference(data)) {
    try {
      const { event } = await apiRequest<{ event: AppEvent }>(`/api/events/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await saveRemoteRecords('event', [event], event.ownerId);
      return event;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  await queueOfflineJsonMutation({
    type: 'UPDATE',
    entity: 'event',
    entityId: id,
    method: 'PUT',
    endpoint: `/api/events/${encodeURIComponent(id)}`,
    payload: data,
    priority: 45,
  });
  await logOffline('info', 'events', 'Alteracao de evento aguardando internet.', { eventId: id });
  return updatedLocal || null;
}

export async function deleteEvent(id: string) {
  const pendingCreate = await findPendingCreateForEntity('event', id);
  if (pendingCreate) {
    await removeQueueItem(pendingCreate.id);
    await deleteLocalRecord('event', id);
    return;
  }

  const existing = await localEventPayload(id);
  if (existing) {
    await saveLocalRecord({
      id,
      remoteId: id,
      entity: 'event',
      ownerId: existing.ownerId,
      payload: existing,
      syncStatus: 'pending_delete',
      deletedAt: nowIso(),
      source: 'local',
    });
  }

  if (isOnline()) {
    try {
      await apiRequest<{ ok: boolean }>(`/api/events/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await deleteLocalRecord('event', id);
      return;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  await queueOfflineJsonMutation({
    type: 'DELETE',
    entity: 'event',
    entityId: id,
    method: 'DELETE',
    endpoint: `/api/events/${encodeURIComponent(id)}`,
    priority: 40,
  });
}

export async function getEvent(id: string): Promise<AppEvent | null> {
  if (isOnline()) {
    try {
      const { event } = await apiRequest<{ event: AppEvent | null }>(`/api/events/${encodeURIComponent(id)}`);
      if (event) await saveRemoteRecords('event', [event], event.ownerId);
      return event;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  return await localEventPayload(id) || null;
}

export async function getEventBySlug(slug: string): Promise<AppEvent | null> {
  if (isOnline()) {
    try {
      const { event } = await apiRequest<{ event: AppEvent | null }>(`/api/events/slug/${encodeURIComponent(slug)}`);
      if (event) await saveRemoteRecords('event', [event], event.ownerId);
      return event;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  const events = await listVisibleLocalPayloads<AppEvent>('event');
  return events.find((event) => event.slug === slug) || null;
}

export async function getUserEvents(ownerId: string): Promise<AppEvent[]> {
  if (isOnline()) {
    try {
      const { events } = await apiRequest<{ events: AppEvent[] }>('/api/events');
      await saveRemoteRecords('event', events, ownerId);
      return sortEvents(await listVisibleLocalPayloads<AppEvent>('event', ownerId));
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  const local = await listVisibleLocalPayloads<AppEvent>('event', ownerId);
  return sortEvents(local);
}

export async function getAllEvents(): Promise<AppEvent[]> {
  const { events } = await apiRequest<{ events: AppEvent[] }>('/api/events/admin/all/list');
  await saveRemoteRecords('event', events);
  return events;
}

export async function duplicateEvent(id: string, ownerId: string): Promise<AppEvent> {
  if (isOnline()) {
    try {
      const { event } = await apiRequest<{ event: AppEvent }>(`/api/events/${encodeURIComponent(id)}/duplicate`, {
        method: 'POST',
      });
      await saveRemoteRecords('event', [event], ownerId);
      return event;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  const original = await localEventPayload(id);
  if (!original) throw new Error('EVENT_NOT_FOUND');
  const { id: _id, slug: _slug, createdAt: _createdAt, updatedAt: _updatedAt, ...copy } = original;
  return createEvent(ownerId, {
    ...copy,
    name: `${original.name} copia`,
    status: 'draft',
  });
}
