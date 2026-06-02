import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminFirestore } from './firebaseAdmin';

export const NOTIFICATION_CATEGORIES = ['support', 'billing', 'video', 'event', 'template', 'system', 'admin'] as const;
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number];

export type NotificationPreferences = {
  inApp: boolean;
  browser: boolean;
  sound: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  categories: Record<NotificationCategory, boolean>;
};

type CreateNotificationInput = {
  recipientUid: string;
  category: NotificationCategory;
  title: string;
  body: string;
  link?: string;
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, unknown>;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: true,
  browser: false,
  sound: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  categories: {
    support: true,
    billing: true,
    video: true,
    event: true,
    template: true,
    system: true,
    admin: true,
  },
};

function getDb() {
  const db = getFirebaseAdminFirestore();
  if (!db) {
    const err = new Error('FIREBASE_ADMIN_FIRESTORE_NOT_CONFIGURED');
    (err as any).status = 500;
    throw err;
  }
  return db;
}

function cleanString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeTime(value: unknown, fallback: string) {
  const text = cleanString(value, fallback);
  return /^\d{2}:\d{2}$/.test(text) ? text : fallback;
}

function normalizeCategories(value: unknown) {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return NOTIFICATION_CATEGORIES.reduce((acc, category) => {
    acc[category] = typeof input[category] === 'boolean'
      ? Boolean(input[category])
      : DEFAULT_NOTIFICATION_PREFERENCES.categories[category];
    return acc;
  }, {} as Record<NotificationCategory, boolean>);
}

export function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const quietHours = input.quietHours && typeof input.quietHours === 'object'
    ? input.quietHours as Record<string, unknown>
    : {};

  return {
    inApp: typeof input.inApp === 'boolean' ? input.inApp : DEFAULT_NOTIFICATION_PREFERENCES.inApp,
    browser: typeof input.browser === 'boolean' ? input.browser : DEFAULT_NOTIFICATION_PREFERENCES.browser,
    sound: typeof input.sound === 'boolean' ? input.sound : DEFAULT_NOTIFICATION_PREFERENCES.sound,
    quietHours: {
      enabled: typeof quietHours.enabled === 'boolean' ? quietHours.enabled : DEFAULT_NOTIFICATION_PREFERENCES.quietHours.enabled,
      start: normalizeTime(quietHours.start, DEFAULT_NOTIFICATION_PREFERENCES.quietHours.start),
      end: normalizeTime(quietHours.end, DEFAULT_NOTIFICATION_PREFERENCES.quietHours.end),
    },
    categories: normalizeCategories(input.categories),
  };
}

export async function getNotificationPreferences(uid: string) {
  const snap = await getDb().collection('users').doc(uid).get();
  return normalizeNotificationPreferences(snap.data()?.notificationPreferences);
}

export async function setNotificationPreferences(uid: string, preferences: NotificationPreferences) {
  const normalized = normalizeNotificationPreferences(preferences);
  await getDb().collection('users').doc(uid).set({
    notificationPreferences: normalized,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return normalized;
}

export async function createNotification(input: CreateNotificationInput) {
  if (!input.recipientUid || input.recipientUid.startsWith('anonymous:')) return null;

  const preferences = await getNotificationPreferences(input.recipientUid).catch(() => DEFAULT_NOTIFICATION_PREFERENCES);
  if (!preferences.inApp || !preferences.categories[input.category]) return null;

  const now = new Date().toISOString();
  const ref = await getDb().collection('notifications').add({
    recipientUid: input.recipientUid,
    category: input.category,
    title: input.title.slice(0, 140),
    body: input.body.slice(0, 500),
    link: input.link || '',
    priority: input.priority || 'normal',
    metadata: input.metadata || {},
    readAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    _ts: FieldValue.serverTimestamp(),
  });

  return { id: ref.id };
}

export async function createAdminNotification(input: Omit<CreateNotificationInput, 'recipientUid'>) {
  const adminUid = (process.env.ADMIN_UID || '').trim();
  if (!adminUid) return null;
  return createNotification({ ...input, recipientUid: adminUid });
}
