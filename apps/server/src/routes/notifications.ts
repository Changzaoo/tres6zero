import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getAuthenticatedUser, requireAdmin } from './auth';
import { getFirebaseAdminFirestore } from '../services/firebaseAdmin';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_CATEGORIES,
  createNotification,
  getNotificationPreferences,
  normalizeNotificationPreferences,
  setNotificationPreferences,
} from '../services/notifications';

export const notificationsRouter = Router();

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

const preferenceSchema = z.object({
  inApp: z.boolean(),
  browser: z.boolean(),
  sound: z.boolean(),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  categories: z.object(
    Object.fromEntries(NOTIFICATION_CATEGORIES.map((category) => [category, z.boolean()])) as Record<typeof NOTIFICATION_CATEGORIES[number], z.ZodBoolean>
  ),
});

const broadcastSchema = z.object({
  recipientUid: z.string().min(1).optional(),
  title: z.string().min(3).max(140),
  body: z.string().min(1).max(500),
  category: z.enum(NOTIFICATION_CATEGORIES).default('admin'),
  link: z.string().max(500).optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});

function getDb() {
  const db = getFirebaseAdminFirestore();
  if (!db) {
    const err = new Error('FIREBASE_ADMIN_FIRESTORE_NOT_CONFIGURED');
    (err as any).status = 500;
    throw err;
  }
  return db;
}

function notificationFromDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    recipientUid: data.recipientUid || '',
    category: data.category || 'system',
    title: data.title || '',
    body: data.body || '',
    link: data.link || '',
    priority: data.priority || 'normal',
    metadata: data.metadata || {},
    readAt: data.readAt || null,
    archivedAt: data.archivedAt || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
  };
}

async function getOwnedNotification(uid: string, id: string) {
  const snap = await getDb().collection('notifications').doc(id).get();
  if (!snap.exists) {
    const err = new Error('NOTIFICATION_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const notification = notificationFromDoc(snap);
  if (notification.recipientUid !== uid) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  return { ref: snap.ref, notification };
}

async function listNotifications(uid: string, limit: number, unreadOnly: boolean) {
  let query: FirebaseFirestore.Query = getDb()
    .collection('notifications')
    .where('recipientUid', '==', uid)
    .where('archivedAt', '==', null);

  if (unreadOnly) {
    query = query.where('readAt', '==', null);
  }

  const snap = await query.get();
  const allNotifications = snap.docs
    .map(notificationFromDoc)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = allNotifications.filter((notification) => !notification.readAt).length;
  const notifications = allNotifications.slice(0, limit);
  return { notifications, unreadCount };
}

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { limit, unreadOnly } = listSchema.parse(req.query);
    const { notifications, unreadCount } = await listNotifications(user.localId, limit, unreadOnly);
    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get('/preferences', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    res.json({ preferences: await getNotificationPreferences(user.localId) });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.put('/preferences', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    const preferences = normalizeNotificationPreferences(preferenceSchema.parse(req.body || DEFAULT_NOTIFICATION_PREFERENCES));
    res.json({ preferences: await setNotificationPreferences(user.localId, preferences) });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch('/:id/read', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { ref } = await getOwnedNotification(user.localId, req.params.id);
    const now = new Date().toISOString();
    await ref.update({ readAt: now, updatedAt: now, _ts: FieldValue.serverTimestamp() });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post('/read-all', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    const snap = await getDb()
      .collection('notifications')
      .where('recipientUid', '==', user.localId)
      .get();
    const unreadDocs = snap.docs.filter((doc) => {
      const data = doc.data() || {};
      return !data.readAt && !data.archivedAt;
    });

    const batch = getDb().batch();
    const now = new Date().toISOString();
    unreadDocs.forEach((doc) => batch.update(doc.ref, { readAt: now, updatedAt: now, _ts: FieldValue.serverTimestamp() }));
    if (unreadDocs.length) {
      await batch.commit();
    }
    res.json({ ok: true, count: unreadDocs.length });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.delete('/:id', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { ref } = await getOwnedNotification(user.localId, req.params.id);
    const now = new Date().toISOString();
    await ref.update({ archivedAt: now, updatedAt: now, _ts: FieldValue.serverTimestamp() });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post('/admin/broadcast', requireAdmin, async (req, res, next) => {
  try {
    const data = broadcastSchema.parse(req.body || {});

    if (data.recipientUid) {
      await createNotification({
        recipientUid: data.recipientUid,
        title: data.title,
        body: data.body,
        category: data.category,
        link: data.link,
        priority: data.priority,
      });
      res.json({ ok: true, count: 1 });
      return;
    }

    const users = await getDb().collection('users').get();
    let count = 0;
    await Promise.all(users.docs.map(async (doc) => {
      await createNotification({
        recipientUid: doc.id,
        title: data.title,
        body: data.body,
        category: data.category,
        link: data.link,
        priority: data.priority,
      });
      count += 1;
    }));

    res.json({ ok: true, count });
  } catch (error) {
    next(error);
  }
});
