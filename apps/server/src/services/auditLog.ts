import type { Request } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminFirestore } from './firebaseAdmin';
import { getRequestDevice, getRequestDeviceHash } from './trustedDevices';

export type AuthAuditType = 'register' | 'login' | 'password_reset' | 'logout';

type AuthAuditInput = {
  type: AuthAuditType;
  uid?: string | null;
  email?: string | null;
  success: boolean;
  reason?: string | null;
};

function normalizeEmail(value?: string | null) {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, 160) : null;
}

function clientIp(req: Request) {
  const forwarded = req.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.ip || req.socket.remoteAddress || '';
  return ip.replace(/^::ffff:/, '') || 'desconhecido';
}

function decodeHeader(value?: string) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function requestLocation(req: Request) {
  const country = req.get('x-vercel-ip-country') || req.get('cf-ipcountry') || null;
  const city = decodeHeader(req.get('x-vercel-ip-city'));
  const region = decodeHeader(req.get('x-vercel-ip-country-region'));
  const parts = [city, region, country].filter(Boolean);

  return {
    city,
    region,
    country,
    location: parts.length > 0 ? parts.join(', ') : null,
  };
}

function safeHeader(value?: string, maxLength = 240) {
  return (value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength) || null;
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

export function auditReasonFromError(error: unknown) {
  if (!error) return 'UNKNOWN_ERROR';
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  if (code) return code.slice(0, 180);
  return error instanceof Error ? error.message.slice(0, 180) : String(error).slice(0, 180);
}

export async function recordAuthAuditLog(req: Request, input: AuthAuditInput) {
  try {
    const db = getFirebaseAdminFirestore();
    if (!db) return;

    const now = new Date().toISOString();
    const ip = clientIp(req);
    const geo = requestLocation(req);
    let deviceHash: string | null = null;
    let deviceName: string | null = null;

    try {
      deviceHash = getRequestDeviceHash(req);
      deviceName = getRequestDevice(req).deviceName;
    } catch {
      deviceHash = null;
      deviceName = safeHeader(req.get('x-six3-device-name'), 80);
    }

    const userAgent = safeHeader(req.get('user-agent'), 260);
    const auditPayload = {
      category: 'auth',
      type: input.type,
      uid: input.uid || null,
      email: normalizeEmail(input.email),
      success: input.success,
      reason: input.reason ? String(input.reason).slice(0, 180) : null,
      ip,
      userAgent,
      deviceHash,
      deviceName,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      location: geo.location,
      method: req.method,
      path: safeHeader(req.originalUrl || req.path, 180),
      origin: safeHeader(req.get('origin'), 180),
      referer: safeHeader(req.get('referer'), 240),
      createdAt: now,
      _ts: FieldValue.serverTimestamp(),
    };

    await db.collection('auditLogs').add(auditPayload);

    if (input.type === 'login' || input.type === 'register') {
      await db.collection('user_login_events').add({
        userId: input.uid || null,
        email: normalizeEmail(input.email),
        loginAt: now,
        createdAt: now,
        ip,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        location: geo.location,
        deviceType: parseDeviceType(userAgent),
        os: parseOs(userAgent),
        browser: parseBrowser(userAgent),
        userAgent,
        sessionId: deviceHash,
        deviceHash,
        deviceName,
        loginMethod: 'email',
        success: input.success,
        failureReason: input.success ? null : input.reason ? String(input.reason).slice(0, 180) : 'AUTH_FAILED',
        suspicious: !input.success || !deviceHash,
        _ts: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('[audit] auth log skipped:', error instanceof Error ? error.message : error);
  }
}
