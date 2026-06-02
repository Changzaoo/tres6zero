import crypto from 'crypto';
import { Request } from 'express';
import { getFirebaseAdminAuth } from './firebaseAdmin';

export const TRUSTED_DEVICES_CLAIM = 'six3TrustedDevices';
export const MAX_TRUSTED_DEVICES = 2;

const DEVICE_ID_HEADER = 'x-six3-device-id';
const DEVICE_NAME_HEADER = 'x-six3-device-name';
const DEVICE_LAST_SEEN_UPDATE_MS = 5 * 60 * 1000;

export type TrustedDevice = {
  h: string;
  name: string;
  createdAt: string;
  lastSeenAt: string;
};

type ClaimSource = {
  localId: string;
  customAttributes?: string;
};

function authError(message: string, status: number): never {
  const err = new Error(message);
  (err as any).status = status;
  (err as any).code = message;
  throw err;
}

function parseCustomClaims(user: ClaimSource) {
  try {
    return user.customAttributes ? JSON.parse(user.customAttributes) as Record<string, unknown> : {};
  } catch {
    return {};
  }
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
  const pepper = process.env.DEVICE_HASH_SECRET || process.env.SESSION_SECRET || 'six3-device-lock';
  return crypto.createHash('sha256').update(`${pepper}:${deviceId}`).digest('hex');
}

export function getRequestDeviceHash(req: Request) {
  return hashDeviceId(getRequestDevice(req).deviceId);
}

export function getTrustedDevices(user: ClaimSource): TrustedDevice[] {
  const claims = parseCustomClaims(user);
  const raw = claims[TRUSTED_DEVICES_CLAIM];

  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is TrustedDevice => (
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as TrustedDevice).h === 'string' &&
      typeof (item as TrustedDevice).createdAt === 'string' &&
      typeof (item as TrustedDevice).lastSeenAt === 'string'
    ))
    .slice(0, MAX_TRUSTED_DEVICES)
    .map((item) => ({
      h: item.h,
      name: sanitizeDeviceName(item.name),
      createdAt: item.createdAt,
      lastSeenAt: item.lastSeenAt,
    }));
}

function shouldRefreshLastSeen(device: TrustedDevice, now: Date) {
  const lastSeenAt = new Date(device.lastSeenAt).getTime();
  return Number.isNaN(lastSeenAt) || now.getTime() - lastSeenAt > DEVICE_LAST_SEEN_UPDATE_MS;
}

async function saveTrustedDevices(uid: string, devices: TrustedDevice[]) {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    authError('DEVICE_SECURITY_NOT_CONFIGURED', 500);
  }

  const record = await adminAuth.getUser(uid);
  await adminAuth.setCustomUserClaims(uid, {
    ...(record.customClaims || {}),
    [TRUSTED_DEVICES_CLAIM]: devices.slice(0, MAX_TRUSTED_DEVICES),
  });
}

export function ensureTrustedDeviceSecurityConfigured() {
  if (process.env.DEVICE_LIMIT_ENABLED === 'false') return;
  if (!getFirebaseAdminAuth()) {
    authError('DEVICE_SECURITY_NOT_CONFIGURED', 500);
  }
}

export async function assertTrustedDevice(req: Request, user: ClaimSource) {
  if (process.env.DEVICE_LIMIT_ENABLED === 'false') return false;

  const { deviceId, deviceName } = getRequestDevice(req);
  const deviceHash = hashDeviceId(deviceId);
  const devices = getTrustedDevices(user);
  const now = new Date();
  const current = devices.find((device) => device.h === deviceHash);

  if (current) {
    if (shouldRefreshLastSeen(current, now) || current.name !== deviceName) {
      await saveTrustedDevices(user.localId, devices.map((device) => (
        device.h === deviceHash
          ? { ...device, name: deviceName, lastSeenAt: now.toISOString() }
          : device
      )));
      return true;
    }
    return false;
  }

  if (devices.length >= MAX_TRUSTED_DEVICES) {
    authError('DEVICE_LIMIT_REACHED', 403);
  }

  await saveTrustedDevices(user.localId, [
    ...devices,
    {
      h: deviceHash,
      name: deviceName,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
    },
  ]);
  return true;
}

export function publicTrustedDevices(user: ClaimSource, currentDeviceHash?: string) {
  return getTrustedDevices(user).map((device, index) => ({
    id: `${index + 1}-${device.h.slice(0, 10)}`,
    name: device.name,
    createdAt: device.createdAt,
    lastSeenAt: device.lastSeenAt,
    isCurrent: Boolean(currentDeviceHash && device.h === currentDeviceHash),
  }));
}
