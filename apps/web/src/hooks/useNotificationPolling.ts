import { useEffect, useRef } from 'react';
import { toast } from '@/components/ui/Toast';
import { getNotificationPreferences, listNotifications, mergeNotificationPreferences } from '@/services/notificationService';
import { useNotificationStore } from '@/store/notificationStore';
import type { AppNotification, NotificationPreferences } from '@/types';
import type { UserProfile } from '@/types';

const POLL_INTERVAL_MS = 18_000;

function minutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function isQuietNow(preferences: NotificationPreferences) {
  if (!preferences.quietHours.enabled) return false;

  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = minutes(preferences.quietHours.start);
  const end = minutes(preferences.quietHours.end);

  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function notifyBrowser(notification: AppNotification, preferences: NotificationPreferences) {
  if (!preferences.browser || isQuietNow(preferences)) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const browserNotification = new Notification(notification.title, {
    body: notification.body,
    icon: '/app-icon.png',
    badge: '/app-icon.png',
    tag: notification.id,
  });

  browserNotification.onclick = () => {
    window.focus();
    if (notification.link) {
      window.location.assign(notification.link);
    }
    browserNotification.close();
  };
}

function playNotificationSound(preferences: NotificationPreferences) {
  if (!preferences.sound || isQuietNow(preferences)) return;

  try {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.04, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
    oscillator.stop(context.currentTime + 0.24);
    window.setTimeout(() => context.close().catch(() => undefined), 320);
  } catch {
    // Some browsers block audio until the user interacts with the page.
  }
}

export function useNotificationPolling(user: UserProfile | null | undefined) {
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const preferencesRef = useRef<NotificationPreferences>(useNotificationStore.getState().preferences);

  useEffect(() => useNotificationStore.subscribe((state) => {
    preferencesRef.current = state.preferences;
  }), []);

  useEffect(() => {
    if (!user) {
      useNotificationStore.getState().reset();
      knownIds.current = new Set();
      firstLoad.current = true;
      return undefined;
    }

    const store = useNotificationStore.getState();
    store.setPreferences(mergeNotificationPreferences(user.notificationPreferences));

    let active = true;

    async function refresh(showRealtimeFeedback = true) {
      try {
        useNotificationStore.getState().setLoading(true);
        const [preferencesResult, notificationsResult] = await Promise.allSettled([
          getNotificationPreferences(),
          listNotifications({ limit: 60 }),
        ]);

        if (!active) return;

        if (preferencesResult.status === 'fulfilled') {
          useNotificationStore.getState().setPreferences(preferencesResult.value.preferences);
        }

        if (notificationsResult.status === 'fulfilled') {
          const notifications = notificationsResult.value.notifications;
          const preferences = preferencesRef.current;
          const nextIds = new Set(notifications.map((notification) => notification.id));
          const freshUnread = notifications.filter((notification) => (
            !notification.readAt
            && !knownIds.current.has(notification.id)
            && preferences.categories[notification.category]
          ));

          useNotificationStore.getState().setNotifications(notifications, notificationsResult.value.unreadCount);

          if (!firstLoad.current && showRealtimeFeedback && freshUnread.length > 0) {
            const newest = freshUnread[0];
            toast.info(newest.title);
            notifyBrowser(newest, preferences);
            playNotificationSound(preferences);
          }

          knownIds.current = nextIds;
          firstLoad.current = false;
        }
      } catch (error) {
        if (!firstLoad.current) {
          console.warn('[notifications] refresh failed:', error);
        }
      } finally {
        if (active) useNotificationStore.getState().setLoading(false);
      }
    }

    refresh(false);
    const interval = window.setInterval(() => refresh(true), POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user?.uid]);
}
