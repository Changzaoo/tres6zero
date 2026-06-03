import { API_URL } from '@/config/api';
import { apiRequest, getDeviceId } from '@/services/authService';
import type { EngagementEvent, EngagementEventType } from '@/types';

let trackingApiUnavailable = false;

export function getPublicVisitorId() {
  return getDeviceId();
}

export function trackEngagement(data: {
  type: EngagementEventType;
  eventId?: string | null;
  videoId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (trackingApiUnavailable) return Promise.resolve(undefined);

  return fetch(`${API_URL}/api/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      eventId: data.eventId || undefined,
      videoId: data.videoId || undefined,
      visitorId: getPublicVisitorId(),
    }),
  })
    .then((response) => {
      if (response.status === 404) trackingApiUnavailable = true;
      return undefined;
    })
    .catch(() => undefined);
}

export async function getEngagementEvents() {
  if (trackingApiUnavailable) return [];

  try {
    const { events } = await apiRequest<{ events: EngagementEvent[] }>('/api/track');
    return events;
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      trackingApiUnavailable = true;
      return [];
    }
    throw error;
  }
}
