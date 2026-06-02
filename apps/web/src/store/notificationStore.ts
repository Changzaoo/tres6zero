import { create } from 'zustand';
import { defaultNotificationPreferences, mergeNotificationPreferences } from '@/services/notificationService';
import type { AppNotification, NotificationPreferences } from '@/types';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setNotifications: (notifications: AppNotification[], unreadCount?: number) => void;
  setPreferences: (preferences: Partial<NotificationPreferences> | NotificationPreferences) => void;
  markReadLocal: (id: string) => void;
  markAllReadLocal: () => void;
  archiveLocal: (id: string) => void;
  reset: () => void;
}

function unreadCountFrom(notifications: AppNotification[]) {
  return notifications.filter((notification) => !notification.readAt).length;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  preferences: defaultNotificationPreferences,
  loading: false,
  setLoading: (loading) => set({ loading }),
  setNotifications: (notifications, unreadCount) => set({
    notifications,
    unreadCount: unreadCount ?? unreadCountFrom(notifications),
  }),
  setPreferences: (preferences) => set({
    preferences: mergeNotificationPreferences(preferences),
  }),
  markReadLocal: (id) => set((state) => {
    const notifications = state.notifications.map((notification) => (
      notification.id === id && !notification.readAt
        ? { ...notification, readAt: new Date().toISOString() }
        : notification
    ));
    return { notifications, unreadCount: unreadCountFrom(notifications) };
  }),
  markAllReadLocal: () => set((state) => {
    const now = new Date().toISOString();
    const notifications = state.notifications.map((notification) => ({ ...notification, readAt: notification.readAt || now }));
    return { notifications, unreadCount: 0 };
  }),
  archiveLocal: (id) => set((state) => {
    const notifications = state.notifications.filter((notification) => notification.id !== id);
    return { notifications, unreadCount: unreadCountFrom(notifications) };
  }),
  reset: () => set({
    notifications: [],
    unreadCount: 0,
    preferences: defaultNotificationPreferences,
    loading: false,
  }),
}));
