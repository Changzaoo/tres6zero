import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireActiveSubscription } from './auth';
import { getFirebaseAdminFirestore } from '../services/firebaseAdmin';
import { createNotification } from '../services/notifications';

export const leadRouter = Router();

const leadSchema = z.object({
  eventId: z.string().min(1),
  videoId: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  instagram: z.string().optional(),
  acceptedTerms: z.boolean().default(false),
  source: z.string().min(1).default('gallery'),
});

const exportSchema = z.object({ eventId: z.string().optional() });

type UserProfile = {
  uid: string;
  role: 'admin' | 'user';
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

function leadFromDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  if (!doc.exists) return null;
  const { _ts, ...data } = doc.data() as Record<string, unknown>;
  return { id: doc.id, ...data };
}

function sortByNewest<T extends { createdAt?: string }>(items: T[]) {
  return items.sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

function csvEscape(value: unknown) {
  const text = String(value || '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function leadsToCsv(leads: Array<Record<string, unknown>>) {
  const fields = ['name', 'phone', 'email', 'instagram', 'source', 'eventId', 'videoId', 'createdAt'];
  return [
    fields.join(','),
    ...leads.map((lead) => fields.map((field) => csvEscape(lead[field])).join(',')),
  ].join('\n');
}

async function manageableEventIds(user: UserProfile) {
  const collection = getDb().collection('events');
  const snap = user.role === 'admin'
    ? await collection.get()
    : await collection.where('ownerId', '==', user.uid).get();
  return new Set(snap.docs.map((doc) => doc.id));
}

async function canReadEventLeads(user: UserProfile, eventId: string) {
  if (user.role === 'admin') return true;
  const snap = await getDb().collection('events').doc(eventId).get();
  return snap.exists && snap.data()?.ownerId === user.uid;
}

async function loadLeads(user: UserProfile, eventId?: string) {
  const db = getDb();

  if (eventId) {
    if (!(await canReadEventLeads(user, eventId))) {
      const err = new Error('FORBIDDEN');
      (err as any).status = 403;
      throw err;
    }

    const snap = await db.collection('leads').where('eventId', '==', eventId).get();
    return sortByNewest(snap.docs.map(leadFromDoc).filter(isPresent) as Array<Record<string, unknown>>);
  }

  if (user.role === 'admin') {
    const snap = await db.collection('leads').get();
    return sortByNewest(snap.docs.map(leadFromDoc).filter(isPresent) as Array<Record<string, unknown>>);
  }

  const eventIds = Array.from(await manageableEventIds(user));
  if (eventIds.length === 0) return [];

  const leads: Array<Record<string, unknown>> = [];
  for (let i = 0; i < eventIds.length; i += 10) {
    const chunk = eventIds.slice(i, i + 10);
    const snap = await db.collection('leads').where('eventId', 'in', chunk).get();
    leads.push(...(snap.docs.map(leadFromDoc).filter(isPresent) as Array<Record<string, unknown>>));
  }

  return sortByNewest(leads);
}

leadRouter.post('/', async (req, res, next) => {
  try {
    const data = leadSchema.parse(req.body || {});
    const now = new Date().toISOString();
    const ref = await getDb().collection('leads').add({
      ...data,
      email: data.email || '',
      createdAt: now,
      _ts: FieldValue.serverTimestamp(),
    });

    const eventSnap = await getDb().collection('events').doc(data.eventId).get();
    const ownerUid = eventSnap.exists ? eventSnap.data()?.ownerId : null;
    if (typeof ownerUid === 'string') {
      await createNotification({
        recipientUid: ownerUid,
        category: 'event',
        title: 'Novo lead capturado',
        body: `${data.name} deixou contato na galeria.`,
        link: '/app/leads',
        priority: 'normal',
        metadata: { leadId: ref.id, eventId: data.eventId, videoId: data.videoId },
      }).catch((error) => console.warn('[notifications] lead skipped:', error instanceof Error ? error.message : error));
    }

    res.status(201).json({ lead: { id: ref.id, ...data, email: data.email || '', createdAt: now } });
  } catch (e) { next(e); }
});

leadRouter.get('/', requireActiveSubscription, async (_req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    res.json({ leads: await loadLeads(user) });
  } catch (e) { next(e); }
});

leadRouter.get('/event/:eventId', requireActiveSubscription, async (req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    res.json({ leads: await loadLeads(user, req.params.eventId) });
  } catch (e) { next(e); }
});

leadRouter.post('/export', requireActiveSubscription, (req, res, next) => {
  Promise.resolve().then(async () => {
    const user = res.locals.user as UserProfile;
    const { eventId } = exportSchema.parse(req.body);
    const leads = await loadLeads(user, eventId);
    const csv = 'name,phone,email,instagram,source,createdAt\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(leads.length ? leadsToCsv(leads) : csv);
  }).catch(next);
});
