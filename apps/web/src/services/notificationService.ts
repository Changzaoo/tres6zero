import { apiRequest } from '@/services/authService';
import type { AppNotification, NotificationCategory, NotificationPreferences } from '@/types';

export const notificationCategories: { value: NotificationCategory; label: string; description: string }[] = [
  { value: 'support', label: 'Suporte', description: 'Respostas do admin e novos chamados.' },
  { value: 'billing', label: 'Pagamentos', description: 'Confirmações, vencimento e mudanças de plano.' },
  { value: 'video', label: 'Vídeos', description: 'Processamento, falhas e publicações.' },
  { value: 'event', label: 'Eventos', description: 'Criação, alteração e status de eventos.' },
  { value: 'template', label: 'Templates', description: 'Uploads e mudanças no catálogo.' },
  { value: 'system', label: 'Sistema', description: 'Avisos operacionais da plataforma.' },
  { value: 'admin', label: 'Admin', description: 'Comunicados internos e alertas administrativos.' },
];

export const defaultNotificationPreferences: NotificationPreferences = {
  inApp: true,
  browser: false,
  sound: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  categories: notificationCategories.reduce((acc, category) => {
    acc[category.value] = true;
    return acc;
  }, {} as Record<NotificationCategory, boolean>),
};

export function mergeNotificationPreferences(value?: Partial<NotificationPreferences> | null): NotificationPreferences {
  return {
    ...defaultNotificationPreferences,
    ...value,
    quietHours: {
      ...defaultNotificationPreferences.quietHours,
      ...(value?.quietHours || {}),
    },
    categories: {
      ...defaultNotificationPreferences.categories,
      ...(value?.categories || {}),
    },
  };
}

export function listNotifications(options: { limit?: number; unreadOnly?: boolean } = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.unreadOnly) params.set('unreadOnly', 'true');
  const query = params.toString();
  return apiRequest<{ notifications: AppNotification[]; unreadCount: number }>(`/api/notifications${query ? `?${query}` : ''}`);
}

export function getNotificationPreferences() {
  return apiRequest<{ preferences: NotificationPreferences }>('/api/notifications/preferences');
}

export function updateNotificationPreferences(preferences: NotificationPreferences) {
  return apiRequest<{ preferences: NotificationPreferences }>('/api/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });
}

export function markNotificationRead(id: string) {
  return apiRequest<{ ok: true }>(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsRead() {
  return apiRequest<{ ok: true; count: number }>('/api/notifications/read-all', {
    method: 'POST',
  });
}

export function archiveNotification(id: string) {
  return apiRequest<{ ok: true }>(`/api/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
