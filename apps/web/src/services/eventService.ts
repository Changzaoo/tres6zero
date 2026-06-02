import { apiRequest } from '@/services/authService';
import type { AppEvent } from '@/types';

type CreateEventInput = Omit<AppEvent, 'id' | 'slug' | 'createdAt' | 'updatedAt'>;

export async function createEvent(_ownerId: string, data: CreateEventInput): Promise<AppEvent> {
  const { event } = await apiRequest<{ event: AppEvent }>('/api/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return event;
}

export async function updateEvent(id: string, data: Partial<AppEvent>) {
  const { event } = await apiRequest<{ event: AppEvent }>(`/api/events/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return event;
}

export async function deleteEvent(id: string) {
  await apiRequest<{ ok: boolean }>(`/api/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function getEvent(id: string): Promise<AppEvent | null> {
  const { event } = await apiRequest<{ event: AppEvent | null }>(`/api/events/${encodeURIComponent(id)}`);
  return event;
}

export async function getEventBySlug(slug: string): Promise<AppEvent | null> {
  const { event } = await apiRequest<{ event: AppEvent | null }>(`/api/events/slug/${encodeURIComponent(slug)}`);
  return event;
}

export async function getUserEvents(_ownerId: string): Promise<AppEvent[]> {
  const { events } = await apiRequest<{ events: AppEvent[] }>('/api/events');
  return events;
}

export async function getAllEvents(): Promise<AppEvent[]> {
  const { events } = await apiRequest<{ events: AppEvent[] }>('/api/events/admin/all/list');
  return events;
}

export async function duplicateEvent(id: string, _ownerId: string): Promise<AppEvent> {
  const { event } = await apiRequest<{ event: AppEvent }>(`/api/events/${encodeURIComponent(id)}/duplicate`, {
    method: 'POST',
  });
  return event;
}
