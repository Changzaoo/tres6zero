import crypto from 'crypto';
import type { Request } from 'express';

function normalizeVisitorId(value: unknown) {
  const visitorId = typeof value === 'string' ? value.trim() : '';
  if (!/^[A-Za-z0-9._:-]{16,180}$/.test(visitorId)) return null;
  return visitorId;
}

export function hashPublicVisitorId(value: unknown) {
  const visitorId = normalizeVisitorId(value);
  if (!visitorId) return null;

  const pepper = process.env.VISITOR_HASH_SECRET || process.env.DEVICE_HASH_SECRET || process.env.SESSION_SECRET || 'six3-public-visitors';
  return crypto.createHash('sha256').update(`${pepper}:${visitorId}`).digest('hex');
}

export function requestIp(req: Request) {
  const forwarded = req.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.ip || req.socket.remoteAddress || '';
  return ip.replace(/^::ffff:/, '') || 'desconhecido';
}

export function requestUserAgent(req: Request) {
  return (req.get('user-agent') || '').replace(/\s+/g, ' ').trim().slice(0, 260) || null;
}
