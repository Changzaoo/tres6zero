import { Router } from 'express';
import type { UserRecord } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../services/firebaseAdmin';
import { requireAdmin } from './auth';
import { getPlan, BILLING_PLANS, type BillingPlanId } from '../services/stripeBilling';
import { getPlanEntitlements } from '../services/planEntitlements';
import { createNotification } from '../services/notifications';

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

const adminPlanOriginSchema = z.enum(['payment', 'manual_admin', 'affiliate', 'coupon', 'trial', 'promotion', 'support']);
const DEFAULT_ADMIN_PLAN_REASON = 'Alteracao manual de plano pelo admin';

function optionalAdminReason(defaultReason = DEFAULT_ADMIN_PLAN_REASON) {
  return z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().max(500).optional().default(defaultReason),
  );
}

function optionalAdminPlanOrigin(defaultOrigin: AdminPlanOrigin = 'manual_admin') {
  return z.preprocess(
    (value) => adminPlanOriginSchema.safeParse(value).success ? value : undefined,
    adminPlanOriginSchema.optional().default(defaultOrigin),
  );
}

const manualPlanSchema = z.object({
  planId: z.enum(['starter', 'pro', 'unlimited']),
  startsImmediately: z.boolean().optional().default(true),
  expiresAt: z.string().datetime().optional().nullable(),
  keepCurrentExpiration: z.boolean().optional().default(false),
  lifetime: z.boolean().optional().default(false),
  special: z.boolean().optional().default(false),
  origin: optionalAdminPlanOrigin(),
  resetLimits: z.boolean().optional().default(false),
  applyPlanLimits: z.boolean().optional().default(true),
  reason: optionalAdminReason(),
});

const adjustPlanDaysSchema = z.object({
  mode: z.enum(['add', 'remove', 'set_expiration', 'expire_now']),
  days: z.number().int().positive().max(3650).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  reason: z.string().trim().min(3).max(500),
});

const trialSchema = z.object({
  planId: z.enum(['starter', 'pro', 'unlimited']).optional().default('starter'),
  days: z.number().int().positive().max(365).default(7),
  reason: z.string().trim().min(3).max(500),
});

const lifetimeSchema = z.object({
  planId: z.enum(['starter', 'pro', 'unlimited']),
  special: z.boolean().optional().default(false),
  reason: optionalAdminReason(),
});

const suspendSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

const noteSchema = z.object({
  note: z.string().trim().min(2).max(2000),
});

type ManagedUserRole = 'admin' | 'support' | 'user';
type AdminPlanOrigin = z.infer<typeof adminPlanOriginSchema>;
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

function planDateFromClaimsAndStored(claims: Record<string, unknown>, stored: RecordData, field: string) {
  return stringOrNull(claims[field]) || stringOrNull(stored[field]);
}

function parseIsoDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function daysUntil(value?: string | null) {
  const date = parseIsoDate(value);
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function computedPlanStatus(input: {
  disabled?: boolean;
  banned?: boolean;
  subscriptionStatus?: string | null;
  planId?: string | null;
  currentPeriodEnd?: string | null;
  planLifetime?: boolean;
  trialEndsAt?: string | null;
}) {
  if (input.banned) return 'banned';
  if (input.disabled) return 'suspended';
  if (input.planLifetime) return 'lifetime';
  const trialEnd = parseIsoDate(input.trialEndsAt);
  if (trialEnd && trialEnd.getTime() > Date.now()) return 'trial';
  if (!input.planId || input.subscriptionStatus !== 'active') return 'inactive';
  const expiresAt = parseIsoDate(input.currentPeriodEnd);
  if (expiresAt && expiresAt.getTime() <= Date.now()) return 'expired';
  return 'active';
}

function planOriginLabel(origin?: string | null): AdminPlanOrigin | null {
  return adminPlanOriginSchema.safeParse(origin).success ? origin as AdminPlanOrigin : null;
}

function planAccessSummary(authUser: UserRecord | null | undefined, stored: RecordData) {
  const claims = authUser?.customClaims || {};
  const planId = stringOrNull(claims.planId) || stringOrNull(stored.planId);
  const currentPeriodEnd = planDateFromClaimsAndStored(claims, stored, 'currentPeriodEnd')
    || planDateFromClaimsAndStored(claims, stored, 'planExpiresAt');
  const planLifetime = booleanValue(claims.planLifetime) || booleanValue(stored.planLifetime);
  const subscriptionStatus = stringOrNull(claims.subscriptionStatus) || stringOrNull(stored.subscriptionStatus);
  const trialEndsAt = planDateFromClaimsAndStored(claims, stored, 'trialEndsAt');

  return {
    subscriptionStatus,
    planId,
    billingProvider: stringOrNull(claims.billingProvider) || stringOrNull(stored.billingProvider),
    currentPeriodEnd: planLifetime ? null : currentPeriodEnd,
    planExpiresAt: planLifetime ? null : currentPeriodEnd,
    planStartedAt: planDateFromClaimsAndStored(claims, stored, 'planStartedAt'),
    planOrigin: planOriginLabel(stringOrNull(claims.planOrigin) || stringOrNull(stored.planOrigin)) || 'payment',
    planLifetime,
    planSpecial: booleanValue(claims.planSpecial) || booleanValue(stored.planSpecial),
    trialStartedAt: planDateFromClaimsAndStored(claims, stored, 'trialStartedAt'),
    trialEndsAt,
    renewalDay: typeof claims.renewalDay === 'number'
      ? claims.renewalDay
      : numberValue(stored.renewalDay, Number(claims.renewalDay || 0) || 0) || null,
    lastPlanChangeAt: planDateFromClaimsAndStored(claims, stored, 'lastPlanChangeAt'),
    manualPlanReason: stringValue(stored.manualPlanReason),
  };
}

function sanitizePlanId(planId?: string | null): BillingPlanId | null {
  return getPlan(planId || '')?.id || null;
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
        location: stringValue(data.location, 'Localização não identificada'),
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
    const ban = activeBanFromData(stored);
    const access = planAccessSummary(authUser, stored);
    const createdAt = authUser?.metadata.creationTime
      ? new Date(authUser.metadata.creationTime).toISOString()
      : isoFromValue(stored.createdAt, '');
    const disabled = Boolean(authUser?.disabled) || booleanValue(stored.suspended);

    return {
      uid,
      name: authUser?.displayName || stringValue(stored.name, stringValue(stored.companyName, 'Usuário')),
      email: authUser?.email || stringValue(stored.email, ''),
      role: roleFromAuthAndStored(authUser, stored, uid, currentAdminUid),
      disabled,
      emailVerified: Boolean(authUser?.emailVerified),
      subscriptionStatus: access.subscriptionStatus,
      planId: access.planId,
      billingProvider: access.billingProvider,
      currentPeriodEnd: access.currentPeriodEnd,
      planExpiresAt: access.planExpiresAt,
      planStartedAt: access.planStartedAt,
      planOrigin: access.planOrigin,
      planLifetime: access.planLifetime,
      planSpecial: access.planSpecial,
      trialStartedAt: access.trialStartedAt,
      trialEndsAt: access.trialEndsAt,
      renewalDay: access.renewalDay,
      daysRemaining: daysUntil(access.currentPeriodEnd),
      planStatus: computedPlanStatus({
        disabled,
        banned: ban.banned,
        subscriptionStatus: access.subscriptionStatus,
        planId: access.planId,
        currentPeriodEnd: access.currentPeriodEnd,
        planLifetime: access.planLifetime,
        trialEndsAt: access.trialEndsAt,
      }),
      lastPlanChangeAt: access.lastPlanChangeAt,
      manualPlanReason: access.manualPlanReason,
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
      sourceTitle: stringValue(input.sourceTitle, input.source === 'event' ? 'Evento' : 'Vídeo'),
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
      oldValue: typeof data.oldValue === 'object' && data.oldValue ? data.oldValue : {},
      newValue: typeof data.newValue === 'object' && data.newValue ? data.newValue : {},
      origin: stringValue(data.origin),
      metadata: typeof data.metadata === 'object' && data.metadata ? data.metadata : {},
      createdAt: isoFromValue(data.createdAt, ''),
    };
  })).slice(0, 200);
}

async function loadUserUsage(db: Firestore, uid: string) {
  const [eventsSnap, videosSnap] = await Promise.all([
    db.collection('events').where('ownerId', '==', uid).get().catch(() => null),
    db.collection('videos').where('ownerId', '==', uid).get().catch(() => null),
  ]);
  const eventIds = (eventsSnap?.docs || []).map((doc) => doc.id);
  const videoIds = (videosSnap?.docs || []).map((doc) => doc.id);
  const leadIds = new Set<string>();
  const engagementDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  const seenEngagement = new Set<string>();

  async function collectByIds(collection: string, field: string, ids: string[], add: (doc: FirebaseFirestore.QueryDocumentSnapshot) => void) {
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      if (chunk.length === 0) continue;
      const snap = await db.collection(collection).where(field, 'in', chunk).get().catch(() => null);
      (snap?.docs || []).forEach(add);
    }
  }

  await Promise.all([
    collectByIds('leads', 'eventId', eventIds, (doc) => leadIds.add(doc.id)),
    collectByIds('leads', 'videoId', videoIds, (doc) => leadIds.add(doc.id)),
    collectByIds('engagementEvents', 'eventId', eventIds, (doc) => {
      if (!seenEngagement.has(doc.id)) {
        seenEngagement.add(doc.id);
        engagementDocs.push(doc);
      }
    }),
    collectByIds('engagementEvents', 'videoId', videoIds, (doc) => {
      if (!seenEngagement.has(doc.id)) {
        seenEngagement.add(doc.id);
        engagementDocs.push(doc);
      }
    }),
  ]);

  return {
    uploads: videoIds.length,
    videos: videoIds.length,
    events: eventIds.length,
    templatesUsed: 0,
    storageBytes: 0,
    leads: leadIds.size,
    downloads: engagementDocs.filter((doc) => stringValue((doc.data() as RecordData).type) === 'download').length,
    views: engagementDocs.filter((doc) => stringValue((doc.data() as RecordData).type) === 'view').length,
    shares: engagementDocs.filter((doc) => ['share', 'whatsapp', 'copy_link'].includes(stringValue((doc.data() as RecordData).type))).length,
    publications: videoIds.length,
  };
}

async function loadUserBillingPayments(db: Firestore, uid: string) {
  const snap = await db.collection('billingPayments').where('userId', '==', uid).get().catch(() => null);
  return sortByNewest((snap?.docs || []).map((doc) => {
    const data = doc.data() as RecordData;
    return {
      id: doc.id,
      provider: stringValue(data.provider, 'pixgo'),
      paymentId: stringValue(data.paymentId, doc.id),
      externalId: stringValue(data.externalId),
      planId: stringOrNull(data.planId),
      planName: stringValue(data.planName),
      amount: numberValue(data.amount),
      amountCents: numberValue(data.amountCents),
      status: stringValue(data.status, 'unknown'),
      paidAt: stringOrNull(data.paidAt),
      expiresAt: stringOrNull(data.expiresAt),
      currentPeriodEnd: stringOrNull(data.currentPeriodEnd),
      createdAt: isoFromValue(data.createdAt, ''),
      updatedAt: isoFromValue(data.updatedAt, ''),
    };
  })).slice(0, 60);
}

async function loadUserAdminNotes(db: Firestore, uid: string) {
  const snap = await db.collection('users').doc(uid).collection('adminNotes').get().catch(() => null);
  return sortByNewest((snap?.docs || []).map((doc) => {
    const data = doc.data() as RecordData;
    return {
      id: doc.id,
      note: stringValue(data.note),
      createdAt: isoFromValue(data.createdAt, ''),
      createdBy: stringOrNull(data.createdBy),
      createdByEmail: stringOrNull(data.createdByEmail),
    };
  })).slice(0, 80);
}

async function getAuthUser(uid: string) {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) return null;
  return adminAuth.getUser(uid).catch(() => null);
}

function authUserSummary(authUser: UserRecord | null, stored: RecordData, uid: string, currentAdminUid?: string) {
  const ban = activeBanFromData(stored);
  const access = planAccessSummary(authUser, stored);
  const disabled = Boolean(authUser?.disabled) || booleanValue(stored.suspended);
  return {
    uid,
    name: authUser?.displayName || stringValue(stored.name, stringValue(stored.companyName, 'Usuário')),
    email: authUser?.email || stringValue(stored.email, ''),
    role: roleFromAuthAndStored(authUser, stored, uid, currentAdminUid),
    disabled,
    emailVerified: Boolean(authUser?.emailVerified),
    subscriptionStatus: access.subscriptionStatus,
    planId: access.planId,
    billingProvider: access.billingProvider,
    currentPeriodEnd: access.currentPeriodEnd,
    planExpiresAt: access.planExpiresAt,
    planStartedAt: access.planStartedAt,
    planOrigin: access.planOrigin,
    planLifetime: access.planLifetime,
    planSpecial: access.planSpecial,
    trialStartedAt: access.trialStartedAt,
    trialEndsAt: access.trialEndsAt,
    renewalDay: access.renewalDay,
    daysRemaining: daysUntil(access.currentPeriodEnd),
    planStatus: computedPlanStatus({
      disabled,
      banned: ban.banned,
      subscriptionStatus: access.subscriptionStatus,
      planId: access.planId,
      currentPeriodEnd: access.currentPeriodEnd,
      planLifetime: access.planLifetime,
      trialEndsAt: access.trialEndsAt,
    }),
    lastPlanChangeAt: access.lastPlanChangeAt,
    manualPlanReason: access.manualPlanReason,
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
  const [loginEvents, auditLogs, usage, billingPayments, adminNotes] = await Promise.all([
    loadUserLoginEvents(db, uid, user.email),
    loadAdminAuditLogs(db, uid),
    loadUserUsage(db, uid),
    loadUserBillingPayments(db, uid),
    loadUserAdminNotes(db, uid),
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
      entitlements: getPlanEntitlements(user.planId),
    },
    loginEvents,
    devices,
    auditLogs,
    usage,
    billingPayments,
    adminNotes,
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
  action:
    | 'USER_BANNED'
    | 'USER_UNBANNED'
    | 'USER_ROLE_UPDATED'
    | 'SUPPORT_USER_CREATED'
    | 'PLAN_CHANGED'
    | 'DAYS_ADDED'
    | 'DAYS_REMOVED'
    | 'PLAN_EXPIRED'
    | 'USER_SUSPENDED'
    | 'USER_REACTIVATED'
    | 'TRIAL_GRANTED'
    | 'LIFETIME_GRANTED'
    | 'MANUAL_NOTE_ADDED';
  targetUserId: string;
  targetEmail?: string | null;
  reason?: string;
  adminUser: RecordData;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  await db.collection('admin_audit_logs').add({
    action: input.action,
    targetUserId: input.targetUserId,
    targetEmail: input.targetEmail || '',
    reason: input.reason || '',
    performedBy: stringOrNull(input.adminUser.uid),
    performedByEmail: stringOrNull(input.adminUser.email),
    oldValue: input.oldValue || {},
    newValue: input.newValue || {},
    origin: 'admin_panel',
    createdAt: new Date().toISOString(),
    metadata: input.metadata || {},
    _ts: FieldValue.serverTimestamp(),
  });
}

function planSnapshot(user: ReturnType<typeof authUserSummary>) {
  return {
    subscriptionStatus: user.subscriptionStatus || null,
    planId: user.planId || null,
    billingProvider: user.billingProvider || null,
    currentPeriodEnd: user.currentPeriodEnd || null,
    planExpiresAt: user.planExpiresAt || null,
    planStartedAt: user.planStartedAt || null,
    planOrigin: user.planOrigin || null,
    planLifetime: Boolean(user.planLifetime),
    planSpecial: Boolean(user.planSpecial),
    trialStartedAt: user.trialStartedAt || null,
    trialEndsAt: user.trialEndsAt || null,
    daysRemaining: user.daysRemaining ?? null,
    planStatus: user.planStatus || null,
  };
}

async function getPlanMutationTarget(db: Firestore, uid: string, currentAdminUid?: string) {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    const err = new Error('FIREBASE_ADMIN_AUTH_NOT_CONFIGURED');
    (err as any).status = 500;
    throw err;
  }

  const ref = db.collection('users').doc(uid);
  const [authUser, storedSnap] = await Promise.all([getAuthUser(uid), ref.get()]);
  if (!authUser) {
    const err = new Error('USER_AUTH_RECORD_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const stored = storedSnap.exists ? storedSnap.data() as RecordData : {};
  return {
    adminAuth,
    ref,
    authUser,
    stored,
    user: authUserSummary(authUser, stored, uid, currentAdminUid),
  };
}

async function applyPlanAccess(db: Firestore, input: {
  uid: string;
  planId: BillingPlanId | null;
  subscriptionStatus: 'active' | 'unpaid';
  currentPeriodEnd: string | null;
  planStartedAt?: string | null;
  planOrigin?: AdminPlanOrigin;
  planLifetime?: boolean;
  planSpecial?: boolean;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  billingProvider?: string;
  reason?: string;
  resetLimits?: boolean;
  applyPlanLimits?: boolean;
  adminUser: RecordData;
  currentAdminUid?: string;
}) {
  const target = await getPlanMutationTarget(db, input.uid, input.currentAdminUid);
  const currentClaims = target.authUser.customClaims || {};
  const now = new Date().toISOString();
  const renewalDay = input.currentPeriodEnd ? parseIsoDate(input.currentPeriodEnd)?.getUTCDate() || null : null;
  const nextClaims: Record<string, unknown> = {
    ...currentClaims,
    subscriptionStatus: input.subscriptionStatus,
    planId: input.planId,
    billingProvider: input.billingProvider || 'manual',
    currentPeriodEnd: input.currentPeriodEnd,
    planStartedAt: input.planStartedAt || target.user.planStartedAt || now,
    planOrigin: input.planOrigin || 'manual_admin',
    planLifetime: Boolean(input.planLifetime),
    planSpecial: Boolean(input.planSpecial),
    trialStartedAt: input.trialStartedAt || null,
    trialEndsAt: input.trialEndsAt || null,
    renewalDay,
    lastPlanChangeAt: now,
  };

  if (!input.planId) {
    delete nextClaims.planId;
  }

  await target.adminAuth.setCustomUserClaims(input.uid, nextClaims);
  await target.ref.set({
    subscriptionStatus: input.subscriptionStatus,
    planId: input.planId,
    billingProvider: input.billingProvider || 'manual',
    currentPeriodEnd: input.currentPeriodEnd,
    planExpiresAt: input.currentPeriodEnd,
    planStartedAt: input.planStartedAt || target.user.planStartedAt || now,
    planOrigin: input.planOrigin || 'manual_admin',
    planLifetime: Boolean(input.planLifetime),
    planSpecial: Boolean(input.planSpecial),
    trialStartedAt: input.trialStartedAt || null,
    trialEndsAt: input.trialEndsAt || null,
    renewalDay,
    manualPlanReason: input.reason || '',
    planLimitsResetAt: input.resetLimits ? now : target.stored.planLimitsResetAt || null,
    planLimitsAppliedAt: input.applyPlanLimits ? now : target.stored.planLimitsAppliedAt || null,
    lastPlanChangeAt: now,
    updatedAt: now,
    _ts: FieldValue.serverTimestamp(),
  }, { merge: true });

  await createNotification({
    recipientUid: input.uid,
    category: 'billing',
    title: input.subscriptionStatus === 'active' ? 'Plano atualizado' : 'Plano atualizado pelo admin',
    body: input.planId
      ? `Seu plano ${BILLING_PLANS[input.planId].name} foi atualizado.`
      : 'Seu acesso de plano foi atualizado.',
    link: '/app/billing',
    priority: 'normal',
    metadata: { source: 'admin_panel', planId: input.planId, currentPeriodEnd: input.currentPeriodEnd },
  }).catch((error) => console.warn('[notifications] manual plan skipped:', error instanceof Error ? error.message : error));

  return {
    before: target.user,
    after: await loadUserDetails(db, input.uid, input.currentAdminUid),
  };
}

adminRouter.get('/users/:uid/details', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    res.json(await loadUserDetails(db, req.params.uid, res.locals.user?.uid));
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/trial-requests', requireAdmin, async (_req, res, next) => {
  try {
    const db = getDb();
    const snap = await db.collection('trialRequests').get();
    const requests = snap.docs
      .map((doc) => {
        const { _ts, ...data } = doc.data() as Record<string, unknown>;
        return { id: doc.id, ...data };
      })
      .sort((a, b) => Date.parse(String((b as { createdAt?: string }).createdAt || '')) - Date.parse(String((a as { createdAt?: string }).createdAt || '')));
    res.json({ requests });
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

adminRouter.post('/users/:uid/plan', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const input = manualPlanSchema.parse(req.body || {});
    const target = await getPlanMutationTarget(db, req.params.uid, res.locals.user?.uid);
    const plan = getPlan(input.planId);
    if (!plan) {
      const err = new Error('INVALID_PLAN');
      (err as any).status = 400;
      throw err;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const before = planSnapshot(target.user);

    if (!input.startsImmediately) {
      await target.ref.set({
        pendingManualPlan: {
          planId: plan.id,
          requestedAt: nowIso,
          requestedBy: res.locals.user.uid,
          reason: input.reason,
          origin: input.origin,
          expiresAt: input.expiresAt || null,
        },
        updatedAt: nowIso,
        _ts: FieldValue.serverTimestamp(),
      }, { merge: true });

      await writeAdminAudit(db, {
        action: 'PLAN_CHANGED',
        targetUserId: req.params.uid,
        targetEmail: target.user.email,
        reason: input.reason,
        adminUser: res.locals.user,
        oldValue: before,
        newValue: { pendingPlanId: plan.id, startsImmediately: false, expiresAt: input.expiresAt || null },
        metadata: { scheduled: true, origin: input.origin },
      });

      res.json(await loadUserDetails(db, req.params.uid, res.locals.user?.uid));
      return;
    }

    const currentExpiration = target.user.currentPeriodEnd || target.user.planExpiresAt || null;
    const currentExpirationDate = parseIsoDate(currentExpiration);
    const canKeepCurrentExpiration = Boolean(
      input.keepCurrentExpiration
      && currentExpirationDate
      && currentExpirationDate.getTime() > now.getTime()
    );
    const expiresAt = input.lifetime
      ? null
      : canKeepCurrentExpiration && currentExpirationDate
        ? currentExpirationDate.toISOString()
        : input.expiresAt || addDays(now, 30).toISOString();

    if (!input.lifetime) {
      const expirationDate = parseIsoDate(expiresAt);
      if (!expirationDate || expirationDate.getTime() <= Date.now()) {
        const err = new Error('PLAN_EXPIRATION_MUST_BE_FUTURE');
        (err as any).status = 400;
        throw err;
      }
    }

    const result = await applyPlanAccess(db, {
      uid: req.params.uid,
      planId: plan.id,
      subscriptionStatus: 'active',
      currentPeriodEnd: expiresAt,
      planStartedAt: nowIso,
      planOrigin: input.origin,
      planLifetime: input.lifetime,
      planSpecial: input.special,
      billingProvider: 'manual',
      reason: input.reason,
      resetLimits: input.resetLimits,
      applyPlanLimits: input.applyPlanLimits,
      adminUser: res.locals.user,
      currentAdminUid: res.locals.user?.uid,
    });

    await writeAdminAudit(db, {
      action: input.lifetime ? 'LIFETIME_GRANTED' : 'PLAN_CHANGED',
      targetUserId: req.params.uid,
      targetEmail: result.after.user.email,
      reason: input.reason,
      adminUser: res.locals.user,
      oldValue: before,
      newValue: planSnapshot(result.after.user),
      metadata: {
        origin: input.origin,
        resetLimits: input.resetLimits,
        applyPlanLimits: input.applyPlanLimits,
      },
    });

    res.json(result.after);
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/users/:uid/plan/days', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const input = adjustPlanDaysSchema.parse(req.body || {});
    const target = await getPlanMutationTarget(db, req.params.uid, res.locals.user?.uid);
    const planId = sanitizePlanId(target.user.planId);
    if (!planId) {
      const err = new Error('USER_HAS_NO_PLAN');
      (err as any).status = 400;
      throw err;
    }

    const before = planSnapshot(target.user);
    const now = new Date();
    const currentEnd = parseIsoDate(target.user.currentPeriodEnd);
    const base = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
    let nextEnd: Date;

    if (input.mode === 'expire_now') {
      nextEnd = new Date(Date.now() - 60 * 1000);
    } else if (input.mode === 'set_expiration') {
      const parsed = parseIsoDate(input.expiresAt);
      if (!parsed) {
        const err = new Error('INVALID_EXPIRATION_DATE');
        (err as any).status = 400;
        throw err;
      }
      nextEnd = parsed;
    } else {
      const days = input.days || 0;
      nextEnd = addDays(base, input.mode === 'add' ? days : -days);
    }

    const result = await applyPlanAccess(db, {
      uid: req.params.uid,
      planId,
      subscriptionStatus: 'active',
      currentPeriodEnd: nextEnd.toISOString(),
      planStartedAt: target.user.planStartedAt || new Date().toISOString(),
      planOrigin: target.user.planOrigin || 'manual_admin',
      planLifetime: false,
      planSpecial: target.user.planSpecial,
      billingProvider: target.user.billingProvider || 'manual',
      reason: input.reason,
      adminUser: res.locals.user,
      currentAdminUid: res.locals.user?.uid,
    });

    const action = input.mode === 'add'
      ? 'DAYS_ADDED'
      : input.mode === 'expire_now'
        ? 'PLAN_EXPIRED'
        : 'DAYS_REMOVED';

    await writeAdminAudit(db, {
      action,
      targetUserId: req.params.uid,
      targetEmail: result.after.user.email,
      reason: input.reason,
      adminUser: res.locals.user,
      oldValue: before,
      newValue: planSnapshot(result.after.user),
      metadata: { mode: input.mode, days: input.days || null, expiresAt: nextEnd.toISOString() },
    });

    res.json(result.after);
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/users/:uid/trial', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const input = trialSchema.parse(req.body || {});
    const target = await getPlanMutationTarget(db, req.params.uid, res.locals.user?.uid);
    const plan = getPlan(input.planId);
    if (!plan) {
      const err = new Error('INVALID_PLAN');
      (err as any).status = 400;
      throw err;
    }

    const now = new Date();
    const trialEndsAt = addDays(now, input.days).toISOString();
    const before = planSnapshot(target.user);
    const result = await applyPlanAccess(db, {
      uid: req.params.uid,
      planId: plan.id,
      subscriptionStatus: 'active',
      currentPeriodEnd: trialEndsAt,
      planStartedAt: now.toISOString(),
      planOrigin: 'trial',
      planLifetime: false,
      planSpecial: false,
      trialStartedAt: now.toISOString(),
      trialEndsAt,
      billingProvider: 'manual',
      reason: input.reason,
      adminUser: res.locals.user,
      currentAdminUid: res.locals.user?.uid,
    });

    await writeAdminAudit(db, {
      action: 'TRIAL_GRANTED',
      targetUserId: req.params.uid,
      targetEmail: result.after.user.email,
      reason: input.reason,
      adminUser: res.locals.user,
      oldValue: before,
      newValue: planSnapshot(result.after.user),
      metadata: { days: input.days, planId: plan.id },
    });

    res.json(result.after);
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/users/:uid/lifetime', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const input = lifetimeSchema.parse(req.body || {});
    const target = await getPlanMutationTarget(db, req.params.uid, res.locals.user?.uid);
    const plan = getPlan(input.planId);
    if (!plan) {
      const err = new Error('INVALID_PLAN');
      (err as any).status = 400;
      throw err;
    }

    const before = planSnapshot(target.user);
    const result = await applyPlanAccess(db, {
      uid: req.params.uid,
      planId: plan.id,
      subscriptionStatus: 'active',
      currentPeriodEnd: null,
      planStartedAt: target.user.planStartedAt || new Date().toISOString(),
      planOrigin: 'manual_admin',
      planLifetime: true,
      planSpecial: input.special,
      billingProvider: 'manual',
      reason: input.reason,
      adminUser: res.locals.user,
      currentAdminUid: res.locals.user?.uid,
    });

    await writeAdminAudit(db, {
      action: 'LIFETIME_GRANTED',
      targetUserId: req.params.uid,
      targetEmail: result.after.user.email,
      reason: input.reason,
      adminUser: res.locals.user,
      oldValue: before,
      newValue: planSnapshot(result.after.user),
      metadata: { planId: plan.id, special: input.special },
    });

    res.json(result.after);
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/users/:uid/suspend', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const input = suspendSchema.parse(req.body || {});
    const target = await getPlanMutationTarget(db, req.params.uid, res.locals.user?.uid);
    if (target.user.role === 'admin') {
      const err = new Error('CANNOT_SUSPEND_ADMIN');
      (err as any).status = 400;
      throw err;
    }

    const now = new Date().toISOString();
    await target.adminAuth.updateUser(req.params.uid, { disabled: true });
    await target.ref.set({
      suspended: true,
      suspendedAt: now,
      suspendedBy: res.locals.user.uid,
      suspensionReason: input.reason,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    }, { merge: true });

    await writeAdminAudit(db, {
      action: 'USER_SUSPENDED',
      targetUserId: req.params.uid,
      targetEmail: target.user.email,
      reason: input.reason,
      adminUser: res.locals.user,
      oldValue: { disabled: target.user.disabled },
      newValue: { disabled: true },
    });

    res.json(await loadUserDetails(db, req.params.uid, res.locals.user?.uid));
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/users/:uid/reactivate', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const input = suspendSchema.parse(req.body || {});
    const target = await getPlanMutationTarget(db, req.params.uid, res.locals.user?.uid);
    const now = new Date().toISOString();

    await target.adminAuth.updateUser(req.params.uid, { disabled: false });
    await target.ref.set({
      suspended: false,
      reactivatedAt: now,
      reactivatedBy: res.locals.user.uid,
      reactivationReason: input.reason,
      banned: false,
      banStatus: 'revoked',
      banRevokedAt: now,
      banRevokedBy: res.locals.user.uid,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    }, { merge: true });

    await writeAdminAudit(db, {
      action: 'USER_REACTIVATED',
      targetUserId: req.params.uid,
      targetEmail: target.user.email,
      reason: input.reason,
      adminUser: res.locals.user,
      oldValue: { disabled: target.user.disabled, banned: target.user.banned },
      newValue: { disabled: false, banned: false },
    });

    res.json(await loadUserDetails(db, req.params.uid, res.locals.user?.uid));
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/users/:uid/notes', requireAdmin, async (req, res, next) => {
  try {
    const db = getDb();
    const input = noteSchema.parse(req.body || {});
    const target = await getPlanMutationTarget(db, req.params.uid, res.locals.user?.uid);
    const now = new Date().toISOString();

    await target.ref.collection('adminNotes').add({
      note: input.note,
      createdAt: now,
      createdBy: res.locals.user.uid,
      createdByEmail: res.locals.user.email || '',
      _ts: FieldValue.serverTimestamp(),
    });
    await target.ref.set({
      adminNotesCount: FieldValue.increment(1),
      lastAdminNoteAt: now,
      updatedAt: now,
      _ts: FieldValue.serverTimestamp(),
    }, { merge: true });

    await writeAdminAudit(db, {
      action: 'MANUAL_NOTE_ADDED',
      targetUserId: req.params.uid,
      targetEmail: target.user.email,
      reason: input.note.slice(0, 500),
      adminUser: res.locals.user,
      newValue: { note: input.note },
    });

    res.status(201).json(await loadUserDetails(db, req.params.uid, res.locals.user?.uid));
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
    const expiringWithin = (days: number) => users.filter((user) => {
      if (user.planLifetime || user.planStatus !== 'active' || typeof user.daysRemaining !== 'number') return false;
      return user.daysRemaining >= 0 && user.daysRemaining <= days;
    }).length;

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
        activeUsers: users.filter((user) => user.planStatus === 'active' || user.planStatus === 'lifetime' || user.planStatus === 'trial').length,
        expiredUsers: users.filter((user) => user.planStatus === 'expired').length,
        trialUsers: users.filter((user) => user.planStatus === 'trial').length,
        bannedOrSuspendedUsers: users.filter((user) => user.planStatus === 'banned' || user.planStatus === 'suspended').length,
        lifetimeUsers: users.filter((user) => user.planStatus === 'lifetime').length,
        expiringIn7Days: expiringWithin(7),
        expiringIn30Days: expiringWithin(30),
        usersByPlan: Object.keys(BILLING_PLANS).reduce((acc, planId) => {
          acc[planId] = users.filter((user) => user.planId === planId).length;
          return acc;
        }, {} as Record<string, number>),
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
