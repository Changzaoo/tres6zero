import { Router } from 'express';
import type { UserRecord } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../services/firebaseAdmin';
import { requireAdmin } from './auth';

export const adminRouter = Router();

type RecordData = Record<string, unknown>;

type AdminDevice = {
  id: string;
  name: string;
  ip: string;
  location: string;
  city: string | null;
  region: string | null;
  country: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
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

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function isoFromValue(value: unknown, fallback = '') {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    try {
      return ((value as { toDate: () => Date }).toDate()).toISOString();
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function publicDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  const { _ts, ...data } = doc.data() as RecordData & { _ts?: unknown };
  return { id: doc.id, ...data };
}

function sortByNewest<T extends RecordData>(items: T[]) {
  return items.sort((a, b) => {
    const bDate = Date.parse(String(b.createdAt || b.updatedAt || ''));
    const aDate = Date.parse(String(a.createdAt || a.updatedAt || ''));
    return (Number.isFinite(bDate) ? bDate : 0) - (Number.isFinite(aDate) ? aDate : 0);
  });
}

async function listAuthUsers() {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) return [];

  const users: UserRecord[] = [];
  let pageToken: string | undefined;

  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken && users.length < 5000);

  return users;
}

async function loadRecentDevices(db: Firestore, uid: string): Promise<AdminDevice[]> {
  try {
    const snap = await db.collection('users').doc(uid).collection('devices').orderBy('lastSeenAt', 'desc').limit(5).get();
    return snap.docs.map((doc) => {
      const data = doc.data() as RecordData;
      return {
        id: doc.id,
        name: stringValue(data.name, 'Dispositivo'),
        ip: stringValue(data.ip, 'desconhecido'),
        location: stringValue(data.location, 'Localizacao nao identificada'),
        city: stringOrNull(data.city),
        region: stringOrNull(data.region),
        country: stringOrNull(data.country),
        userAgent: stringOrNull(data.userAgent),
        createdAt: isoFromValue(data.createdAt, ''),
        lastSeenAt: isoFromValue(data.lastSeenAt, ''),
        revokedAt: stringOrNull(data.revokedAt),
      };
    });
  } catch {
    return [];
  }
}

async function loadUsers(db: Firestore, currentAdminUid?: string) {
  const [authUsers, storedSnap] = await Promise.all([
    listAuthUsers(),
    db.collection('users').get(),
  ]);

  const authMap = new Map(authUsers.map((user) => [user.uid, user]));
  const storedMap = new Map(storedSnap.docs.map((doc) => [doc.id, doc.data() as RecordData]));
  const ids = new Set<string>([...authMap.keys(), ...storedMap.keys()]);

  const users = await Promise.all([...ids].map(async (uid) => {
    const authUser = authMap.get(uid);
    const stored = storedMap.get(uid) || {};
    const claims = authUser?.customClaims || {};
    const createdAt = authUser?.metadata.creationTime
      ? new Date(authUser.metadata.creationTime).toISOString()
      : isoFromValue(stored.createdAt, '');

    return {
      uid,
      name: authUser?.displayName || stringValue(stored.name, stringValue(stored.companyName, 'Usuario')),
      email: authUser?.email || stringValue(stored.email, ''),
      role: uid === currentAdminUid || claims.role === 'admin' ? 'admin' : 'user',
      disabled: Boolean(authUser?.disabled),
      emailVerified: Boolean(authUser?.emailVerified),
      subscriptionStatus: stringOrNull(claims.subscriptionStatus) || stringOrNull(stored.subscriptionStatus),
      planId: stringOrNull(claims.planId) || stringOrNull(stored.planId),
      companyName: stringValue(stored.companyName, ''),
      avatarUrl: stringValue(stored.avatarUrl, ''),
      createdAt,
      lastSignInAt: authUser?.metadata.lastSignInTime ? new Date(authUser.metadata.lastSignInTime).toISOString() : null,
      lastRefreshAt: authUser?.metadata.lastRefreshTime ? new Date(authUser.metadata.lastRefreshTime).toISOString() : null,
      devices: await loadRecentDevices(db, uid),
    };
  }));

  return users.sort((a, b) => {
    const bDate = Date.parse(b.lastSignInAt || b.createdAt || '');
    const aDate = Date.parse(a.lastSignInAt || a.createdAt || '');
    return (Number.isFinite(bDate) ? bDate : 0) - (Number.isFinite(aDate) ? aDate : 0);
  });
}

async function loadCollection(db: Firestore, name: 'events' | 'videos') {
  const snap = await db.collection(name).get();
  return sortByNewest(snap.docs.map(publicDoc));
}

function fileNameFromUrl(url: string) {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop() || url;
    return decodeURIComponent(last).slice(0, 140);
  } catch {
    return url.split('/').pop()?.slice(0, 140) || 'midia';
  }
}

function buildMediaItems(events: RecordData[], videos: RecordData[]) {
  const items: RecordData[] = [];
  const seen = new Set<string>();

  function addMedia(input: {
    kind: string;
    url: unknown;
    ownerId: unknown;
    source: 'event' | 'video';
    sourceId: string;
    sourceTitle: unknown;
    eventId?: unknown;
    videoId?: unknown;
    storagePath?: unknown;
    createdAt?: unknown;
  }) {
    if (typeof input.url !== 'string' || !input.url.trim()) return;
    const key = `${input.source}:${input.sourceId}:${input.kind}:${input.url}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({
      id: `${input.source}-${input.sourceId}-${input.kind}-${items.length}`,
      kind: input.kind,
      url: input.url,
      fileName: fileNameFromUrl(input.url),
      ownerId: stringValue(input.ownerId),
      source: input.source,
      sourceId: input.sourceId,
      sourceTitle: stringValue(input.sourceTitle, input.source === 'event' ? 'Evento' : 'Video'),
      eventId: stringOrNull(input.eventId),
      videoId: stringOrNull(input.videoId),
      storagePath: stringOrNull(input.storagePath),
      createdAt: isoFromValue(input.createdAt, ''),
    });
  }

  events.forEach((event) => {
    const id = stringValue(event.id);
    addMedia({ kind: 'event_cover', url: event.coverUrl, ownerId: event.ownerId, source: 'event', sourceId: id, sourceTitle: event.name, eventId: id, createdAt: event.createdAt });
    addMedia({ kind: 'event_avatar', url: event.avatarUrl, ownerId: event.ownerId, source: 'event', sourceId: id, sourceTitle: event.name, eventId: id, createdAt: event.createdAt });
    addMedia({ kind: 'event_logo', url: event.logoUrl, ownerId: event.ownerId, source: 'event', sourceId: id, sourceTitle: event.name, eventId: id, createdAt: event.createdAt });

    const mediaUrls = Array.isArray(event.mediaUrls) ? event.mediaUrls : [];
    mediaUrls.forEach((url) => addMedia({
      kind: 'event_media',
      url,
      ownerId: event.ownerId,
      source: 'event',
      sourceId: id,
      sourceTitle: event.name,
      eventId: id,
      createdAt: event.createdAt,
    }));
  });

  videos.forEach((video) => {
    const id = stringValue(video.id);
    addMedia({ kind: 'video', url: video.videoUrl, ownerId: video.ownerId, source: 'video', sourceId: id, sourceTitle: video.title, eventId: video.eventId, videoId: id, storagePath: video.storagePath, createdAt: video.createdAt });
    addMedia({ kind: 'raw_video', url: video.rawVideoUrl, ownerId: video.ownerId, source: 'video', sourceId: id, sourceTitle: video.title, eventId: video.eventId, videoId: id, storagePath: video.storagePath, createdAt: video.createdAt });
    addMedia({ kind: 'thumbnail', url: video.thumbnailUrl, ownerId: video.ownerId, source: 'video', sourceId: id, sourceTitle: video.title, eventId: video.eventId, videoId: id, createdAt: video.createdAt });
    addMedia({ kind: 'music', url: video.musicUrl, ownerId: video.ownerId, source: 'video', sourceId: id, sourceTitle: video.title, eventId: video.eventId, videoId: id, createdAt: video.createdAt });
  });

  return sortByNewest(items).slice(0, 1000);
}

async function loadAuthAuditLogs(db: Firestore) {
  const snap = await db.collection('auditLogs').orderBy('createdAt', 'desc').limit(250).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data() as RecordData;
      return {
        id: doc.id,
        category: stringValue(data.category, 'auth'),
        type: stringValue(data.type, 'login'),
        uid: stringOrNull(data.uid),
        email: stringOrNull(data.email),
        success: booleanValue(data.success),
        reason: stringOrNull(data.reason),
        ip: stringValue(data.ip, 'desconhecido'),
        userAgent: stringOrNull(data.userAgent),
        deviceHash: stringOrNull(data.deviceHash),
        deviceName: stringOrNull(data.deviceName),
        city: stringOrNull(data.city),
        region: stringOrNull(data.region),
        country: stringOrNull(data.country),
        location: stringOrNull(data.location),
        method: stringOrNull(data.method),
        path: stringOrNull(data.path),
        origin: stringOrNull(data.origin),
        referer: stringOrNull(data.referer),
        createdAt: isoFromValue(data.createdAt, ''),
      };
    })
    .filter((log) => log.category === 'auth')
    .slice(0, 200);
}

adminRouter.get('/overview', requireAdmin, async (_req, res, next) => {
  try {
    const db = getDb();
    const adminUid = typeof res.locals.user?.uid === 'string' ? res.locals.user.uid : undefined;
    const [users, events, videos, loginLogs] = await Promise.all([
      loadUsers(db, adminUid),
      loadCollection(db, 'events'),
      loadCollection(db, 'videos'),
      loadAuthAuditLogs(db),
    ]);
    const media = buildMediaItems(events, videos);
    const since24h = Date.now() - 24 * 60 * 60 * 1000;
    const recentLoginLogs = loginLogs.filter((log) => Date.parse(log.createdAt) >= since24h);

    res.json({
      generatedAt: new Date().toISOString(),
      summary: {
        totalUsers: users.length,
        totalEvents: events.length,
        totalVideos: videos.length,
        totalMedia: media.length,
        loginAttempts24h: recentLoginLogs.length,
        failedLoginAttempts24h: recentLoginLogs.filter((log) => !log.success).length,
        disabledUsers: users.filter((user) => user.disabled).length,
      },
      users,
      events,
      videos,
      media,
      loginLogs,
    });
  } catch (error) {
    next(error);
  }
});
