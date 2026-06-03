import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getFirebaseAdminFirestore } from '../services/firebaseAdmin';
import { hashPublicVisitorId, requestIp, requestUserAgent } from '../services/publicVisitors';
import { requireActiveSubscription } from './auth';

export const trackRouter = Router();

const trackSchema = z.object({
  type: z.enum(['view', 'download', 'share', 'whatsapp', 'copy_link', 'qr_code', 'feedback']),
  eventId: z.string().optional(),
  videoId: z.string().optional(),
  visitorId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

type UserProfile = {
  uid: string;
  role: 'admin' | 'user';
};

type EngagementRecord = Record<string, unknown> & {
  id: string;
  eventId?: string;
  videoId?: string;
  createdAt?: string;
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

function sortByNewest<T extends { createdAt?: string }>(items: T[]) {
  return items.sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
}

function eventFromDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  if (!doc.exists) return null;
  const { _ts, ip, userAgent, ...data } = doc.data() as Record<string, unknown>;
  return { id: doc.id, ...data } as EngagementRecord;
}

function sanitizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value) || value == null)
      .map(([key, value]) => [key.slice(0, 60), typeof value === 'string' ? value.slice(0, 220) : value])
  );
}

async function manageableEventIds(user: UserProfile) {
  const collection = getDb().collection('events');
  const snap = user.role === 'admin'
    ? await collection.get()
    : await collection.where('ownerId', '==', user.uid).get();
  return new Set(snap.docs.map((doc) => doc.id));
}

async function manageableVideoIds(user: UserProfile) {
  const collection = getDb().collection('videos');
  const snap = user.role === 'admin'
    ? await collection.get()
    : await collection.where('ownerId', '==', user.uid).get();
  return new Set(snap.docs.map((doc) => doc.id));
}

async function loadEngagementEvents(user: UserProfile) {
  const db = getDb();

  if (user.role === 'admin') {
    const snap = await db.collection('engagementEvents').limit(1200).get();
    return sortByNewest(snap.docs.map(eventFromDoc).filter(Boolean) as EngagementRecord[]);
  }

  const eventIds = Array.from(await manageableEventIds(user));
  const videoIds = Array.from(await manageableVideoIds(user));
  if (eventIds.length === 0 && videoIds.length === 0) return [];

  const items: EngagementRecord[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < eventIds.length; i += 10) {
    const chunk = eventIds.slice(i, i + 10);
    const snap = await db.collection('engagementEvents').where('eventId', 'in', chunk).get();
    snap.docs.forEach((doc) => {
      if (seen.has(doc.id)) return;
      const event = eventFromDoc(doc);
      if (event) {
        seen.add(doc.id);
        items.push(event);
      }
    });
  }

  for (let i = 0; i < videoIds.length; i += 10) {
    const chunk = videoIds.slice(i, i + 10);
    const snap = await db.collection('engagementEvents').where('videoId', 'in', chunk).get();
    snap.docs.forEach((doc) => {
      if (seen.has(doc.id)) return;
      const event = eventFromDoc(doc);
      if (event) {
        seen.add(doc.id);
        items.push(event);
      }
    });
  }

  return sortByNewest(items).slice(0, 1200);
}

trackRouter.post('/', async (req, res, next) => {
  try {
    const data = trackSchema.parse(req.body || {});
    const now = new Date().toISOString();
    const visitorId = hashPublicVisitorId(data.visitorId);

    await getDb().collection('engagementEvents').add({
      type: data.type,
      eventId: data.eventId || null,
      videoId: data.videoId || null,
      visitorId,
      metadata: sanitizeMetadata(data.metadata),
      ip: requestIp(req),
      userAgent: requestUserAgent(req),
      createdAt: now,
      _ts: FieldValue.serverTimestamp(),
    });

    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

trackRouter.get('/', requireActiveSubscription, async (_req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    res.json({ events: await loadEngagementEvents(user) });
  } catch (e) { next(e); }
});
