import crypto from 'crypto';
import { Request } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminFirestore } from './firebaseAdmin';

const DEVICE_ID_HEADER = 'x-six3-device-id';
const DEVICE_NAME_HEADER = 'x-six3-device-name';
const DEVICE_LAST_SEEN_UPDATE_MS = 5 * 60 * 1000;

type ClaimSource = {
  localId: string;
};

type DeviceRecord = {
  name: string;
  ip: string;
  location: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string | null;
};

type GeoLocation = {
  location: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

function authError(message: string, status: number): never {
  const err = new Error(message);
  (err as any).status = status;
  (err as any).code = message;
  throw err;
}

function sanitizeDeviceName(value: unknown) {
  const name = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return (name || 'Dispositivo').slice(0, 80);
}

function normalizeDeviceId(value: unknown) {
  const deviceId = typeof value === 'string' ? value.trim() : '';
  if (!/^[A-Za-z0-9._:-]{24,160}$/.test(deviceId)) {
    authError('DEVICE_ID_REQUIRED', 401);
  }

  return deviceId;
}

export function getRequestDevice(req: Request) {
  const body = typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};
  const deviceId = normalizeDeviceId(req.get(DEVICE_ID_HEADER) || body.deviceId);
  const deviceName = sanitizeDeviceName(req.get(DEVICE_NAME_HEADER) || body.deviceName);

  return { deviceId, deviceName };
}

export function hashDeviceId(deviceId: string) {
  const pepper = process.env.DEVICE_HASH_SECRET || process.env.SESSION_SECRET || 'six3-device-registry';
  return crypto.createHash('sha256').update(`${pepper}:${deviceId}`).digest('hex');
}

export function getRequestDeviceHash(req: Request) {
  return hashDeviceId(getRequestDevice(req).deviceId);
}

function getDeviceCollection(uid: string) {
  const db = getFirebaseAdminFirestore();
  return db?.collection('users').doc(uid).collection('devices') || null;
}

function clientIp(req: Request) {
  const forwarded = req.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.ip || req.socket.remoteAddress || '';
  return ip.replace(/^::ffff:/, '') || 'desconhecido';
}

function isPublicIp(ip: string) {
  return Boolean(ip)
    && ip !== 'desconhecido'
    && ip !== '::1'
    && ip !== '127.0.0.1'
    && !ip.startsWith('10.')
    && !ip.startsWith('192.168.')
    && !/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

function decodeHeader(value?: string) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function locationFromHeaders(req: Request): GeoLocation | null {
  const country = req.get('x-vercel-ip-country') || req.get('cf-ipcountry') || null;
  const city = decodeHeader(req.get('x-vercel-ip-city'));
  const region = decodeHeader(req.get('x-vercel-ip-country-region'));
  const parts = [city, region, country].filter(Boolean);

  return parts.length > 0 ? {
    city,
    region,
    country,
    location: parts.join(', '),
  } : null;
}

async function locationFromIp(ip: string): Promise<GeoLocation | null> {
  if (!isPublicIp(ip)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({})) as {
      city?: string;
      region?: string;
      country_name?: string;
      country_code?: string;
    };

    if (!response.ok) return null;

    const country = payload.country_name || payload.country_code || null;
    const city = payload.city || null;
    const region = payload.region || null;
    const parts = [city, region, country].filter(Boolean);

    return parts.length > 0 ? {
      city,
      region,
      country,
      location: parts.join(', '),
    } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveLocation(req: Request, ip: string) {
  return locationFromHeaders(req)
    || await locationFromIp(ip)
    || { location: isPublicIp(ip) ? 'Localização não identificada' : 'Rede local' };
}

function shouldRefreshLastSeen(device: DeviceRecord | undefined, now: Date, ip: string, name: string) {
  if (!device) return true;
  const lastSeenAt = new Date(device.lastSeenAt).getTime();
  return Number.isNaN(lastSeenAt)
    || now.getTime() - lastSeenAt > DEVICE_LAST_SEEN_UPDATE_MS
    || device.ip !== ip
    || device.name !== name;
}

export function ensureTrustedDeviceSecurityConfigured() {
  // Device security is now a session registry, not a login gate.
}

export async function recordTrustedDevice(req: Request, user: ClaimSource, options: { allowReconnect?: boolean } = {}) {
  const collection = getDeviceCollection(user.localId);
  if (!collection) return false;

  const { deviceId, deviceName } = getRequestDevice(req);
  const deviceHash = hashDeviceId(deviceId);
  const ref = collection.doc(deviceHash);
  const snap = await ref.get();
  const current = snap.exists ? snap.data() as DeviceRecord : undefined;
  const now = new Date();

  if (current?.revokedAt && !options.allowReconnect) {
    authError('DEVICE_DISCONNECTED', 401);
  }

  if (!shouldRefreshLastSeen(current, now, clientIp(req), deviceName) && !current?.revokedAt) {
    return false;
  }

  const ip = clientIp(req);
  const geo = await resolveLocation(req, ip);
  const timestamp = now.toISOString();

  await ref.set({
    name: deviceName,
    ip,
    location: geo.location,
    city: geo.city || null,
    region: geo.region || null,
    country: geo.country || null,
    userAgent: (req.get('user-agent') || '').slice(0, 240),
    createdAt: current?.createdAt || timestamp,
    lastSeenAt: timestamp,
    revokedAt: FieldValue.delete(),
    _ts: FieldValue.serverTimestamp(),
  }, { merge: true });

  return true;
}

export async function assertTrustedDevice(req: Request, user: ClaimSource) {
  await recordTrustedDevice(req, user, { allowReconnect: false });
  return false;
}

export async function registerTrustedDevice(req: Request, user: ClaimSource) {
  await recordTrustedDevice(req, user, { allowReconnect: true });
}

export async function disconnectTrustedDevice(uid: string, deviceId: string) {
  const collection = getDeviceCollection(uid);
  if (!collection) return;

  await collection.doc(deviceId).set({
    revokedAt: new Date().toISOString(),
    _ts: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function disconnectAllTrustedDevices(uid: string) {
  const collection = getDeviceCollection(uid);
  if (!collection) return;

  const snap = await collection.limit(100).get();
  const batch = getFirebaseAdminFirestore()?.batch();
  if (!batch) return;

  const revokedAt = new Date().toISOString();
  snap.docs.forEach((doc) => {
    batch.set(doc.ref, {
      revokedAt,
      _ts: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  await batch.commit();
}

export async function publicTrustedDevices(user: ClaimSource, currentDeviceHash?: string) {
  const collection = getDeviceCollection(user.localId);
  if (!collection) return [];

  const snap = await collection.orderBy('lastSeenAt', 'desc').limit(50).get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() as DeviceRecord }))
    .filter((device) => !device.revokedAt)
    .map((device) => ({
      id: device.id,
      name: device.name,
      ip: device.ip || 'desconhecido',
      location: device.location || 'Localização não identificada',
      city: device.city || null,
      region: device.region || null,
      country: device.country || null,
      createdAt: device.createdAt,
      lastSeenAt: device.lastSeenAt,
      isCurrent: Boolean(currentDeviceHash && device.id === currentDeviceHash),
    }));
}
