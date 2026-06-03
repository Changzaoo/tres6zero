import { API_URL } from '@/config/api';
import { apiRequest, getDeviceId } from '@/services/authService';
import type { EngagementEvent, EngagementEventType } from '@/types';

export function getPublicVisitorId() {
  return getDeviceId();
}

export function trackEngagement(data: {
  type: EngagementEventType;
  eventId?: string | null;
  videoId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return fetch(`${API_URL}/api/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      eventId: data.eventId || undefined,
      videoId: data.videoId || undefined,
      visitorId: getPublicVisitorId(),
    }),
  }).catch(() => undefined);
}

export async function getEngagementEvents() {
  const { events } = await apiRequest<{ events: EngagementEvent[] }>('/api/track');
  return events;
}
