import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireActiveSubscription, requireAdmin } from './auth';
import { getFirebaseAdminFirestore } from '../services/firebaseAdmin';
import { createNotification } from '../services/notifications';

export const eventsRouter = Router();

const eventTypes = ['wedding', 'birthday', 'graduation', 'corporate', 'club', 'inauguration', 'church', 'store', 'other'] as const;
const eventStatuses = ['draft', 'active', 'closed', 'archived'] as const;

const brandingSchema = z.object({
  primaryColor: z.string().min(1).default('#7c3aed'),
  secondaryColor: z.string().min(1).default('#4f46e5'),
  logoUrl: z.string().optional(),
});

const eventSchema = z.object({
  name: z.string().min(2),
  clientName: z.string().min(2),
  date: z.string().min(1),
  location: z.string().min(2),
  type: z.enum(eventTypes),
  status: z.enum(eventStatuses),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  avatarUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  mediaUrls: z.array(z.string()).optional().default([]),
  profileHeadline: z.string().optional(),
  passwordEnabled: z.boolean().optional().default(false),
  branding: brandingSchema.optional().default({ primaryColor: '#7c3aed', secondaryColor: '#4f46e5' }),
  defaultTemplateId: z.string().optional(),
  leadCaptureEnabled: z.boolean().optional().default(false),
  leadCaptureRequired: z.boolean().optional().default(false),
  shareMessage: z.string().optional(),
});

const eventUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  clientName: z.string().min(2).optional(),
  date: z.string().min(1).optional(),
  location: z.string().min(2).optional(),
  type: z.enum(eventTypes).optional(),
  status: z.enum(eventStatuses).optional(),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  avatarUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  profileHeadline: z.string().optional(),
  passwordEnabled: z.boolean().optional(),
  branding: brandingSchema.optional(),
  defaultTemplateId: z.string().optional(),
  leadCaptureEnabled: z.boolean().optional(),
  leadCaptureRequired: z.boolean().optional(),
  shareMessage: z.string().optional(),
});

type UserProfile = {
  uid: string;
  role: 'admin' | 'user';
};

type EventRecord = z.infer<typeof eventSchema> & {
  ownerId: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
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

function slugify(text: string) {
  return `${text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefined(item)])
    ) as T;
  }

  return value;
}

function eventFromDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  if (!doc.exists) return null;
  const { _ts, ...data } = doc.data() as EventRecord & { _ts?: unknown };
  return { id: doc.id, ...data };
}

function sortByNewest<T extends { createdAt?: string }>(items: T[]) {
  return items.sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

function canManageEvent(user: UserProfile, event: { ownerId?: string }) {
  return user.role === 'admin' || event.ownerId === user.uid;
}

async function loadManageableEvent(id: string, user: UserProfile) {
  const snap = await getDb().collection('events').doc(id).get();
  const event = eventFromDoc(snap);
  if (!event) {
    const err = new Error('EVENT_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  if (!canManageEvent(user, event)) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  return event;
}

eventsRouter.get('/slug/:slug', async (req, res, next) => {
  try {
    const snap = await getDb().collection('events').where('slug', '==', req.params.slug).limit(1).get();
    if (snap.empty) {
      res.json({ event: null });
      return;
    }

    res.json({ event: eventFromDoc(snap.docs[0]) });
  } catch (error) {
    next(error);
  }
});

eventsRouter.get('/admin/all/list', requireAdmin, async (_req, res, next) => {
  try {
    const snap = await getDb().collection('events').get();
    const events = sortByNewest(snap.docs.map(eventFromDoc).filter(isPresent));
    res.json({ events });
  } catch (error) {
    next(error);
  }
});

eventsRouter.get('/:id', async (req, res, next) => {
  try {
    const snap = await getDb().collection('events').doc(req.params.id).get();
    res.json({ event: eventFromDoc(snap) });
  } catch (error) {
    next(error);
  }
});

eventsRouter.get('/', requireActiveSubscription, async (_req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const collection = getDb().collection('events');
    const snap = user.role === 'admin'
      ? await collection.get()
      : await collection.where('ownerId', '==', user.uid).get();
    const events = sortByNewest(snap.docs.map(eventFromDoc).filter(isPresent));
    res.json({ events });
  } catch (error) {
    next(error);
  }
});

eventsRouter.post('/', requireActiveSubscription, async (req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const data = eventSchema.parse(req.body || {});
    const clientMutationId = req.get('x-six3-client-mutation-id') || (typeof req.body?.clientMutationId === 'string' ? req.body.clientMutationId : undefined);
    const collection = getDb().collection('events');
    if (clientMutationId) {
      const existing = await collection
        .where('ownerId', '==', user.uid)
        .where('clientMutationId', '==', clientMutationId)
        .limit(1)
        .get();
      if (!existing.empty) {
        res.json({ event: eventFromDoc(existing.docs[0]) });
        return;
      }
    }
    const now = new Date().toISOString();
    const event = stripUndefined({
      ...data,
      ownerId: user.uid,
      clientMutationId,
      slug: slugify(data.name),
      createdAt: now,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    });
    const ref = await collection.add(event);
    const { _ts, ...publicEvent } = event;
    await createNotification({
      recipientUid: user.uid,
      category: 'event',
      title: 'Evento criado',
      body: `${data.name} esta pronto para receber videos e leads.`,
      link: '/app/events',
      priority: 'normal',
      metadata: { eventId: ref.id },
    }).catch((error) => console.warn('[notifications] event create skipped:', error instanceof Error ? error.message : error));
    res.status(201).json({ event: { id: ref.id, ...publicEvent } });
  } catch (error) {
    next(error);
  }
});

eventsRouter.put('/:id', requireActiveSubscription, async (req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    await loadManageableEvent(req.params.id, user);
    const data = stripUndefined(eventUpdateSchema.parse(req.body || {}));
    await getDb().collection('events').doc(req.params.id).update({
      ...data,
      updatedAt: new Date().toISOString(),
      _ts: FieldValue.serverTimestamp(),
    });
    const snap = await getDb().collection('events').doc(req.params.id).get();
    const updatedEvent = eventFromDoc(snap);
    if (updatedEvent) {
      await createNotification({
        recipientUid: updatedEvent.ownerId,
        category: 'event',
        title: 'Evento atualizado',
        body: `${updatedEvent.name} recebeu novas alteracoes.`,
        link: '/app/events',
        priority: 'low',
        metadata: { eventId: req.params.id },
      }).catch((error) => console.warn('[notifications] event update skipped:', error instanceof Error ? error.message : error));
    }
    res.json({ event: updatedEvent });
  } catch (error) {
    next(error);
  }
});

eventsRouter.delete('/:id', requireActiveSubscription, async (req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const event = await loadManageableEvent(req.params.id, user);
    await getDb().collection('events').doc(req.params.id).delete();
    await createNotification({
      recipientUid: event.ownerId,
      category: 'event',
      title: 'Evento removido',
      body: `${event.name} foi removido da sua conta.`,
      link: '/app/events',
      priority: 'low',
      metadata: { eventId: req.params.id },
    }).catch((error) => console.warn('[notifications] event delete skipped:', error instanceof Error ? error.message : error));
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

eventsRouter.post('/:id/duplicate', requireActiveSubscription, async (req, res, next) => {
  try {
    const user = res.locals.user as UserProfile;
    const original = await loadManageableEvent(req.params.id, user);
    const { id: _id, slug: _slug, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = original;
    const now = new Date().toISOString();
    const event = stripUndefined({
      ...rest,
      ownerId: user.uid,
      name: `${rest.name} (copia)`,
      status: 'draft',
      slug: slugify(`${rest.name} copia`),
      createdAt: now,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    });
    const ref = await getDb().collection('events').add(event);
    const { _ts, ...publicEvent } = event;
    await createNotification({
      recipientUid: user.uid,
      category: 'event',
      title: 'Evento duplicado',
      body: `${event.name} foi criado como rascunho.`,
      link: '/app/events',
      priority: 'normal',
      metadata: { eventId: ref.id, originalEventId: req.params.id },
    }).catch((error) => console.warn('[notifications] event duplicate skipped:', error instanceof Error ? error.message : error));
    res.status(201).json({ event: { id: ref.id, ...publicEvent } });
  } catch (error) {
    next(error);
  }
});
