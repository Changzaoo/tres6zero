import { Router } from 'express';
import type { UserRecord } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../services/firebaseAdmin';
import { requireAdmin } from './auth';

export const adminRouter = Router();

type RecordData = Record<string, unknown>;

const banSchema = z.object({
  reason: z.string().trim().max(320).optional().default(''),
  duration: z.enum(['permanent', '1d', '7d', '30d', 'custom']).default('permanent'),
  banExpiresAt: z.string().datetime().optional().nullable(),
  confirmSelfBan: z.boolean().optional().default(false),
});

const userRoleSchema = z.object({
  role: z.enum(['user', 'support']),
});

const createSupportUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

type ManagedUserRole = 'admin' | 'support' | 'user';
type AdminDevice = {
  id: string;
  name: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  ip: string;
  location: string;
  city: string | null;
  region: string | null;
  country: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  loginCount?: number;
  recentIps?: string[];
  trusted?: boolean;
  suspicious?: boolean;
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

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
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

function parseBrowser(userAgent: string | null) {
  const ua = userAgent || '';
  if (/edg/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Desconhecido';
}

function parseOs(userAgent: string | null) {
  const ua = userAgent || '';
  if (/windows/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ios/i.test(ua)) return 'iOS';
  if (/mac os|macintosh/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Desconhecido';
}

function parseDeviceType(userAgent: string | null) {
  const ua = userAgent || '';
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobile|iphone|android/i.test(ua)) return 'mobile';
  if (ua) return 'desktop';
  return 'unknown';
}

function activeBanFromData(data: RecordData) {
  const banExpiresAt = stringOrNull(data.banExpiresAt);
  const expired = Boolean(banExpiresAt && Date.parse(banExpiresAt) <= Date.now());
  const banned = booleanValue(data.banned) && !expired && data.banStatus !== 'revoked' && data.banStatus !== 'expired';
  return {
    banned,
    banReason: stringValue(data.banReason),
    bannedAt: stringOrNull(data.bannedAt),
    bannedBy: stringOrNull(data.bannedBy),
    banExpiresAt: expired ? null : banExpiresAt,
    banStatus: banned ? 'active' : stringValue(data.banStatus, expired ? 'expired' : 'revoked'),
    banRevokedAt: stringOrNull(data.banRevokedAt),
    banRevokedBy: stringOrNull(data.banRevokedBy),
  };
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
      const userAgent = stringOrNull(data.userAgent);
      return {
        id: doc.id,
        name: stringValue(data.name, 'Dispositivo'),
        browser: stringValue(data.browser, parseBrowser(userAgent)),
        os: stringValue(data.os, parseOs(userAgent)),
        deviceType: stringValue(data.deviceType, parseDeviceType(userAgent)),
        ip: stringValue(data.ip, 'desconhecido'),
        location: stringValue(data.location, 'Localizacao nao identificada'),
        city: stringOrNull(data.city),
        region: stringOrNull(data.region),
        country: stringOrNull(data.country),
        userAgent,
        createdAt: isoFromValue(data.createdAt, ''),
        lastSeenAt: isoFromValue(data.lastSeenAt, ''),
        loginCount: numberValue(data.loginCount, 0),
        recentIps: stringArray(data.recentIps).slice(0, 8),
        trusted: !booleanValue(data.suspicious),
        suspicious: booleanValue(data.suspicious),
        revokedAt: stringOrNull(data.revokedAt),
      };
    });
  } catch {
    return [];
  }
}

function roleFromAuthAndStored(
  authUser: UserRecord | null | undefined,
  stored: RecordData,
  uid: string,
  currentAdminUid?: string
): ManagedUserRole {
  const claims = authUser?.customClaims || {};
  if (uid === currentAdminUid || claims.role === 'admin') return 'admin';
  if (claims.role === 'support' || stored.role === 'support') return 'support';
  return 'user';
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
    const ban = activeBanFromData(stored);
    const createdAt = authUser?.metadata.creationTime
      ? new Date(authUser.metadata.creationTime).toISOString()
      : isoFromValue(stored.createdAt, '');

    return {
      uid,
      name: authUser?.displayName || stringValue(stored.name, stringValue(stored.companyName, 'Usuario')),
      email: authUser?.email || stringValue(stored.email, ''),
      role: roleFromAuthAndStored(authUser, stored, uid, currentAdminUid),
      disabled: Boolean(authUser?.disabled),
      emailVerified: Boolean(authUser?.emailVerified),
      subscriptionStatus: stringOrNull(claims.subscriptionStatus) || stringOrNull(stored.subscriptionStatus),
      planId: stringOrNull(claims.planId) || stringOrNull(stored.planId),
      ...ban,
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

function loginEventFromData(id: string, data: RecordData) {
  const userAgent = stringOrNull(data.userAgent);
  const success = booleanValue(data.success);
  return {
    id,
    userId: stringOrNull(data.userId) || stringOrNull(data.uid),
    email: stringOrNull(data.email),
    loginAt: isoFromValue(data.loginAt, isoFromValue(data.createdAt, '')),
    createdAt: isoFromValue(data.createdAt, isoFromValue(data.loginAt, '')),
    ip: stringOrNull(data.ip),
    city: stringOrNull(data.city),
    region: stringOrNull(data.region),
    country: stringOrNull(data.country),
    location: stringOrNull(data.location),
    deviceType: stringValue(data.deviceType, parseDeviceType(userAgent)),
    os: stringValue(data.os, parseOs(userAgent)),
    browser: stringValue(data.browser, parseBrowser(userAgent)),
    userAgent,
    sessionId: stringOrNull(data.sessionId) || stringOrNull(data.deviceHash),
    deviceHash: stringOrNull(data.deviceHash),
    deviceName: stringOrNull(data.deviceName),
    loginMethod: stringValue(data.loginMethod, 'email'),
    success,
    failureReason: stringOrNull(data.failureReason) || stringOrNull(data.reason),
    suspicious: booleanValue(data.suspicious) || !success,
  };
}

async function loadUserLoginEvents(db: Firestore, uid: string, email?: string | null) {
  const events = new Map<string, ReturnType<typeof loginEventFromData>>();

  async function addSnap(snap: FirebaseFirestore.QuerySnapshot, prefix: string) {
    snap.docs.forEach((doc) => {
      const data = doc.data() as RecordData;
      const id = `${prefix}:${doc.id}`;
      events.set(id, loginEventFromData(id, data));
    });
  }

  await addSnap(await db.collection('user_login_events').where('userId', '==', uid).get(), 'login');
  await addSnap(await db.collection('auditLogs').where('uid', '==', uid).get(), 'audit');

  if (email) {
    const emailSnap = await db.collection('auditLogs').where('email', '==', email.toLowerCase()).get();
    emailSnap.docs.forEach((doc) => {
      const data = doc.data() as RecordData;
      if (stringOrNull(data.uid) && stringOrNull(data.uid) !== uid) return;
      const id = `audit-email:${doc.id}`;
      events.set(id, loginEventFromData(id, data));
    });
  }

  return Array.from(events.values())
    .filter((event) => event.loginAt)
    .sort((a, b) => Date.parse(b.loginAt || '') - Date.parse(a.loginAt || ''))
    .slice(0, 300);
}

async function loadUserDevices(db: Firestore, uid: string, loginEvents?: Awaited<ReturnType<typeof loadUserLoginEvents>>) {
  const baseDevices = await loadRecentDevices(db, uid);
  const events = loginEvents || [];

  return baseDevices.map((device) => {
    const deviceEvents = events.filter((event) => event.deviceHash && event.deviceHash === device.id);
    const recentIps = Array.from(new Set([
      ...deviceEvents.map((event) => event.ip).filter((value): value is string => Boolean(value)),
      ...(device.ip ? [device.ip] : []),
    ])).slice(0, 8);

    return {
      ...device,
      browser: device.browser || parseBrowser(device.userAgent),
      os: device.os || parseOs(device.userAgent),
      deviceType: device.deviceType || parseDeviceType(device.userAgent),
      loginCount: device.loginCount || deviceEvents.filter((event) => event.success).length,
      recentIps,
      trusted: !device.suspicious,
      suspicious: Boolean(device.suspicious || deviceEvents.some((event) => event.suspicious)),
    };
  });
}

async function loadAdminAuditLogs(db: Firestore, targetUserId?: string) {
  const collection = db.collection('admin_audit_logs');
  const snap = targetUserId
    ? await collection.where('targetUserId', '==', targetUserId).get()
    : await collection.limit(300).get();

  return sortByNewest(snap.docs.map((doc) => {
    const data = doc.data() as RecordData;
    return {
      id: doc.id,
      action: stringValue(data.action),
      targetUserId: stringOrNull(data.targetUserId),
      targetEmail: stringOrNull(data.targetEmail),
      reason: stringValue(data.reason),
      performedBy: stringOrNull(data.performedBy),
      performedByEmail: stringOrNull(data.performedByEmail),
      metadata: typeof data.metadata === 'object' && data.metadata ? data.metadata : {},
      createdAt: isoFromValue(data.createdAt, ''),
    };
  })).slice(0, 200);
}

async function getAuthUser(uid: string) {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) return null;
  return adminAuth.getUser(uid).catch(() => null);
}

function authUserSummary(authUser: UserRecord | null, stored: RecordData, uid: string, currentAdminUid?: string) {
  const claims = authUser?.customClaims || {};
  const ban = activeBanFromData(stored);
  return {
    uid,
    name: authUser?.displayName || stringValue(stored.name, stringValue(stored.companyName, 'Usuario')),
    email: authUser?.email || stringValue(stored.email, ''),
    role: roleFromAuthAndStored(authUser, stored, uid, currentAdminUid),
    disabled: Boolean(authUser?.disabled),
    emailVerified: Boolean(authUser?.emailVerified),
    subscriptionStatus: stringOrNull(claims.subscriptionStatus) || stringOrNull(stored.subscriptionStatus),
    planId: stringOrNull(claims.planId) || stringOrNull(stored.planId),
    provider: authUser?.providerData?.[0]?.providerId || 'password',
    companyName: stringValue(stored.companyName),
    avatarUrl: stringValue(stored.avatarUrl),
    createdAt: authUser?.metadata.creationTime ? new Date(authUser.metadata.creationTime).toISOString() : isoFromValue(stored.createdAt, ''),
    lastSignInAt: authUser?.metadata.lastSignInTime ? new Date(authUser.metadata.lastSignInTime).toISOString() : null,
    lastRefreshAt: authUser?.metadata.lastRefreshTime ? new Date(authUser.metadata.lastRefreshTime).toISOString() : null,
    ...ban,
  };
}

async function loadUserDetails(db: Firestore, uid: string, currentAdminUid?: string) {
  const [authUser, storedSnap] = await Promise.all([
    getAuthUser(uid),
    db.collection('users').doc(uid).get(),
  ]);
  const stored = storedSnap.exists ? storedSnap.data() as RecordData : {};
  const user = authUserSummary(authUser, stored, uid, currentAdminUid);
  const [loginEvents, auditLogs] = await Promise.all([
    loadUserLoginEvents(db, uid, user.email),
    loadAdminAuditLogs(db, uid),
  ]);
  const devices = await loadUserDevices(db, uid, loginEvents);
  const successfulLogins = loginEvents.filter((event) => event.success);
  const suspicious7d = loginEvents.filter((event) => {
    const loginAt = Date.parse(event.loginAt || '');
    return event.suspicious && Number.isFinite(loginAt) && Date.now() - loginAt <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  return {
    user: {
      ...user,
      loginCount: successfulLogins.length,
      deviceCount: devices.length,
      firstLoginAt: successfulLogins.at(-1)?.loginAt || null,
      lastLoginAt: successfulLogins[0]?.loginAt || user.lastSignInAt || null,
      lastIp: successfulLogins[0]?.ip || devices[0]?.ip || null,
      lastUserAgent: successfulLogins[0]?.userAgent || devices[0]?.userAgent || null,
      signupSource: stringOrNull(stored.signupSource),
      loginMethod: successfulLogins[0]?.loginMethod || user.provider || 'unknown',
      suspiciousEvents7d: suspicious7d,
    },
    loginEvents,
    devices,
    auditLogs,
  };
}

function computeBanExpiresAt(duration: z.infer<typeof banSchema>['duration'], custom?: string | null) {
  if (duration === 'permanent') return null;
  if (duration === 'custom') {
    if (!custom || Date.parse(custom) <= Date.now()) {
      const err = new Error('BAN_EXPIRATION_MUST_BE_FUTURE');
      (err as any).status = 400;
      throw err;
    }
    return custom;
  }

  const days = duration === '1d' ? 1 : duration === '7d' ? 7 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function ensureCanBanTarget(db: Firestore, target: ReturnType<typeof authUserSummary>, adminUser: RecordData, confirmSelfBan?: boolean) {
  if (target.uid === adminUser.uid && !confirmSelfBan) {
    const err = new Error('SELF_BAN_CONFIRMATION_REQUIRED');
    (err as any).status = 400;
    throw err;
  }

  if (target.role === 'admin') {
    const users = await loadUsers(db, stringOrNull(adminUser.uid) || undefined);
    const activeAdmins = users.filter((user) => user.role === 'admin' && !user.banned);
    if (activeAdmins.length <= 1) {
      const err = new Error('CANNOT_BAN_LAST_ADMIN');
      (err as any).status = 400;
      throw err;
    }
  }
}

async function writeAdminAudit(db: Firestore, input: {
  action: 'USER_BANNED' | 'USER_UNBANNED' | 'USER_ROLE_UPDATED' | 'SUPPORT_USER_CREATED';
  targetUserId: string;
  targetEmail?: string | null;
  reason?: string;
  adminUser: RecordData;
  metadata?: Record<string, unknown>;
}) {
  await db.collection('admin_audit_logs').add({
    action: input.action,
    targetUserId: input.targetUserId,
    targetEmail: input.targetEmail || '',
    reason: input.reason || '',
    performedBy: stringOrNull(input.adminUser.uid),
    performedByEmail: stringOrNull(input.adminUser.email),
    createdAt: new Date().toISOString(),
    metadata: input.metadata || {},
    _ts: FieldValue.serverTimestamp(),
  });
}

adminRouter.get('/users/:uid/details', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    res.json(await loadUserDetails(db, req.params.uid, res.locals.user?.uid));
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/users/:uid/login-events', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const authUser = await getAuthUser(req.params.uid);
    res.json({ events: await loadUserLoginEvents(db, req.params.uid, authUser?.email || null) });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/users/:uid/devices', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const authUser = await getAuthUser(req.params.uid);
    const loginEvents = await loadUserLoginEvents(db, req.params.uid, authUser?.email || null);
    res.json({ devices: await loadUserDevices(db, req.params.uid, loginEvents) });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/audit-logs', requireAdmin, async (req, res, next) => {
  try {
    const targetUserId = typeof req.query.targetUserId === 'string' ? req.query.targetUserId : undefined;
    res.json({ logs: await loadAdminAuditLogs(getDb(), targetUserId) });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/users/:uid/role', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const input = userRoleSchema.parse(req.body || {});
    const adminAuth = getFirebaseAdminAuth();

    if (!adminAuth) {
      const err = new Error('FIREBASE_ADMIN_AUTH_NOT_CONFIGURED');
      (err as any).status = 500;
      throw err;
    }

    const ref = db.collection('users').doc(req.params.uid);
    const [authUser, storedSnap] = await Promise.all([getAuthUser(req.params.uid), ref.get()]);
    if (!authUser) {
      const err = new Error('USER_AUTH_RECORD_NOT_FOUND');
      (err as any).status = 404;
      throw err;
    }

    const stored = storedSnap.exists ? storedSnap.data() as RecordData : {};
    const target = authUserSummary(authUser, stored, req.params.uid, res.locals.user?.uid);

    if (target.role === 'admin') {
      const err = new Error('CANNOT_CHANGE_ADMIN_ROLE');
      (err as any).status = 400;
      throw err;
    }

    const currentClaims = authUser.customClaims || {};
    const nextClaims: Record<string, unknown> = { ...currentClaims };
    if (input.role === 'support') {
      nextClaims.role = 'support';
    } else {
      delete nextClaims.role;
    }

    const now = new Date().toISOString();
    await adminAuth.setCustomUserClaims(req.params.uid, nextClaims);
    await ref.set({
      name: target.name,
      email: target.email,
      role: input.role,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    }, { merge: true });

    await writeAdminAudit(db, {
      action: 'USER_ROLE_UPDATED',
      targetUserId: req.params.uid,
      targetEmail: target.email,
      adminUser: res.locals.user,
      metadata: {
        previousRole: target.role,
        newRole: input.role,
      },
    });

    res.json(await loadUserDetails(db, req.params.uid, res.locals.user?.uid));
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/support-users', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const input = createSupportUserSchema.parse(req.body || {});
    const adminAuth = getFirebaseAdminAuth();

    if (!adminAuth) {
      const err = new Error('FIREBASE_ADMIN_AUTH_NOT_CONFIGURED');
      (err as any).status = 500;
      throw err;
    }

    const created = await adminAuth.createUser({
      displayName: input.name,
      email: input.email,
      password: input.password,
      emailVerified: false,
      disabled: false,
    });
    const now = new Date().toISOString();

    await adminAuth.setCustomUserClaims(created.uid, { role: 'support' });
    await db.collection('users').doc(created.uid).set({
      name: input.name,
      email: input.email,
      role: 'support',
      createdAt: now,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    }, { merge: true });

    await writeAdminAudit(db, {
      action: 'SUPPORT_USER_CREATED',
      targetUserId: created.uid,
      targetEmail: input.email,
      adminUser: res.locals.user,
      metadata: {
        role: 'support',
      },
    });

    res.status(201).json(await loadUserDetails(db, created.uid, res.locals.user?.uid));
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/users/:uid/ban', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const input = banSchema.parse(req.body || {});
    const ref = db.collection('users').doc(req.params.uid);
    const [authUser, storedSnap] = await Promise.all([getAuthUser(req.params.uid), ref.get()]);
    const stored = storedSnap.exists ? storedSnap.data() as RecordData : {};
    const target = authUserSummary(authUser, stored, req.params.uid, res.locals.user?.uid);

    if (target.banned) {
      const err = new Error('USER_ALREADY_BANNED');
      (err as any).status = 400;
      throw err;
    }

    await ensureCanBanTarget(db, target, res.locals.user, input.confirmSelfBan);
    const banExpiresAt = computeBanExpiresAt(input.duration, input.banExpiresAt);
    const now = new Date().toISOString();

    await ref.set({
      banned: true,
      banReason: input.reason || '',
      bannedAt: now,
      bannedBy: res.locals.user.uid,
      banExpiresAt,
      banStatus: 'active',
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    }, { merge: true });

    await writeAdminAudit(db, {
      action: 'USER_BANNED',
      targetUserId: req.params.uid,
      targetEmail: target.email,
      reason: input.reason,
      adminUser: res.locals.user,
      metadata: {
        previousStatus: target.banned ? 'banned' : 'active',
        newStatus: 'banned',
        banExpiresAt,
      },
    });

    res.json(await loadUserDetails(db, req.params.uid, res.locals.user?.uid));
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/users/:uid/unban', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const ref = db.collection('users').doc(req.params.uid);
    const [authUser, storedSnap] = await Promise.all([getAuthUser(req.params.uid), ref.get()]);
    const stored = storedSnap.exists ? storedSnap.data() as RecordData : {};
    const target = authUserSummary(authUser, stored, req.params.uid, res.locals.user?.uid);

    if (!target.banned) {
      const err = new Error('USER_NOT_BANNED');
      (err as any).status = 400;
      throw err;
    }

    const now = new Date().toISOString();
    await ref.set({
      banned: false,
      banStatus: 'revoked',
      banRevokedAt: now,
      banRevokedBy: res.locals.user.uid,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    }, { merge: true });

    await writeAdminAudit(db, {
      action: 'USER_UNBANNED',
      targetUserId: req.params.uid,
      targetEmail: target.email,
      adminUser: res.locals.user,
      metadata: {
        previousStatus: 'banned',
        newStatus: 'active',
      },
    });

    res.json(await loadUserDetails(db, req.params.uid, res.locals.user?.uid));
  } catch (error) {
    next(error);
  }
});

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
        supportUsers: users.filter((user) => user.role === 'support').length,
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
