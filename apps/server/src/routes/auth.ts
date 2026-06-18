import crypto from 'crypto';
import { NextFunction, Request, Response, Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { BILLING_PLANS, getStripeAccessForUser } from '../services/stripeBilling';
import { getPlanEntitlements, hasPlanFeature, type PlanFeature } from '../services/planEntitlements';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore, toFirebaseUserRecord } from '../services/firebaseAdmin';
import { auditReasonFromError, recordAuthAuditLog } from '../services/auditLog';
import { createNotification, getNotificationPreferences } from '../services/notifications';
import {
  assertTrustedDevice,
  disconnectAllTrustedDevices,
  disconnectTrustedDevice,
  ensureTrustedDeviceSecurityConfigured,
  getRequestDeviceHash,
  publicTrustedDevices,
  registerTrustedDevice,
} from '../services/trustedDevices';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const resetSchema = z.object({
  email: z.string().email(),
});

const recoveryOptionsSchema = z.object({
  identifier: z.string().min(3).max(120),
});

const recoveryVerifySchema = z.object({
  challengeId: z.string().min(16).max(96),
  selections: z.record(z.string().min(12).max(96)).optional(),
});

const recoveredPasswordSchema = z.object({
  challengeId: z.string().min(16).max(96),
  resetToken: z.string().min(32).max(160),
  newPassword: z.string().min(8),
});

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  companyName: z.string().optional(),
  avatarUrl: z.string().url().or(z.literal('')).optional(),
});

const passwordSchema = z.object({
  newPassword: z.string().min(8),
});

const deviceIdSchema = z.string().regex(/^[a-f0-9]{64}$/);

function attemptedEmailFromBody(body: unknown) {
  if (!body || typeof body !== 'object' || !('email' in body)) return null;
  const email = (body as { email?: unknown }).email;
  return typeof email === 'string' ? email.trim().toLowerCase() : null;
}

type FirebaseAuthResponse = {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email?: string;
  displayName?: string;
};

type FirebaseUserRecord = {
  localId: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  customAttributes?: string;
  createdAt?: string;
};

type UserRole = 'admin' | 'support' | 'user';

type StoredProfileData = {
  role?: UserRole;
  companyName?: string;
  avatarUrl?: string;
  banned?: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
  banExpiresAt?: string | null;
  banStatus?: 'active' | 'expired' | 'revoked';
  banRevokedAt?: string;
  banRevokedBy?: string;
};

type RecoveryOption = {
  id: string;
  value: string;
};

type RecoveryChallengeItem = {
  id: string;
  label: string;
  options: RecoveryOption[];
};

type RecoveryChallengeRecord = {
  uid: string;
  email: string;
  correctOptionIds: Record<string, string>;
  identifierHash?: string;
  attempts: number;
  expiresAt: string;
  resetTokenHash?: string;
  resetTokenExpiresAt?: string;
  verifiedAt?: string;
  passwordResetAt?: string;
};

const RECOVERY_TTL_MS = 10 * 60 * 1000;
const RECOVERY_TOKEN_TTL_MS = 10 * 60 * 1000;
const RECOVERY_MAX_ATTEMPTS = 3;
// Apos 3 respostas erradas, o solicitante (IP + identificador) fica bloqueado por esse periodo.
const RECOVERY_LOCK_MS = Math.max(5, Number(process.env.RECOVERY_LOCK_MINUTES) || 720) * 60 * 1000;
const recoveryMemoryChallenges = new Map<string, RecoveryChallengeRecord>();
const recoveryRateLimits = new Map<string, { count: number; resetAt: number }>();
const recoveryLockouts = new Map<string, { failures: number; lockedUntil: number }>();

function getFirebaseApiKey() {
  const key = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!key) {
    const err = new Error('Firebase API key is not configured on the server.');
    (err as any).status = 500;
    throw err;
  }
  return key;
}

function parsePaidEmails() {
  return new Set(
    (process.env.PAID_USER_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function getBearerToken(header?: string) {
  const [scheme, token] = (header || '').split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : undefined;
}

function authError(message = 'AUTH_REQUIRED', status = 401): never {
  const err = new Error(message);
  (err as any).status = status;
  throw err;
}

async function getUserFromIdToken(idToken: string) {
  const adminAuth = getFirebaseAdminAuth();
  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      const record = await adminAuth.getUser(decoded.uid);
      return toFirebaseUserRecord(record);
    } catch (error) {
      const err = new Error('AUTH_REQUIRED');
      (err as any).status = 401;
      (err as any).code = error instanceof Error ? (error as any).code || 'AUTH_REQUIRED' : 'AUTH_REQUIRED';
      throw err;
    }
  }

  const lookup = await firebaseAuthRequest<{ users: FirebaseUserRecord[] }>('accounts:lookup', { idToken });
  return lookup.users?.[0];
}

function banError(data: { banReason?: string; banExpiresAt?: string | null }): never {
  const err = new Error('Sua conta foi suspensa.');
  (err as any).status = 403;
  (err as any).code = 'BAN_ACTIVE';
  (err as any).banReason = data.banReason || '';
  (err as any).banExpiresAt = data.banExpiresAt || null;
  throw err;
}

async function activeBanForUid(uid: string) {
  const db = getFirebaseAdminFirestore();
  if (!db) return null;

  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data() as StoredProfileData;
  if (!data.banned || data.banStatus === 'revoked' || data.banStatus === 'expired') return null;

  const expiresAt = typeof data.banExpiresAt === 'string' ? data.banExpiresAt : null;
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    await ref.set({
      banned: false,
      banStatus: 'expired',
      banExpiredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _ts: FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => undefined);
    return null;
  }

  return {
    banned: true,
    banReason: typeof data.banReason === 'string' ? data.banReason : '',
    banExpiresAt: expiresAt,
    banStatus: 'active' as const,
  };
}

async function assertUserNotBanned(user: FirebaseUserRecord) {
  const ban = await activeBanForUid(user.localId);
  if (ban) banError(ban);
}

export async function getAuthenticatedUser(req: Request) {
  const idToken = getBearerToken(req.headers.authorization);
  if (!idToken) authError();

  const user = await getUserFromIdToken(idToken);
  if (!user) authError();

  await assertUserNotBanned(user);

  const updatedDevice = await assertTrustedDevice(req, user);
  if (updatedDevice) {
    return await getUserFromIdToken(idToken) || user;
  }

  return user;
}

function firebaseErrorStatus(code?: string) {
  if (code === 'EMAIL_EXISTS') return 409;
  if (code === 'EMAIL_NOT_FOUND' || code === 'INVALID_PASSWORD' || code === 'INVALID_LOGIN_CREDENTIALS') return 401;
  if (code === 'INVALID_ID_TOKEN' || code === 'USER_DISABLED') return 401;
  return 400;
}

async function firebaseAuthRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${getFirebaseApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as any;

  if (!response.ok) {
    const code = payload?.error?.message || 'AUTH_ERROR';
    const err = new Error(code);
    (err as any).status = firebaseErrorStatus(code);
    (err as any).code = code;
    throw err;
  }

  return payload as T;
}

function randomId(bytes = 18) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashRecoveryToken(challengeId: string, resetToken: string) {
  const secret = process.env.PASSWORD_RECOVERY_SECRET || process.env.SESSION_SECRET || 'six3-password-recovery';
  return crypto.createHmac('sha256', secret).update(`${challengeId}:${resetToken}`).digest('hex');
}

function normalizeRecoveryIdentifier(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized.includes('@') && /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(normalized)) {
    return `${normalized}@six3.com`;
  }

  return normalized;
}

function recoveryClientIp(req: Request) {
  const forwarded = req.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (forwarded || req.ip || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
}

function assertRecoveryRateLimit(req: Request, identifier: string) {
  const now = Date.now();
  const identifierHash = crypto.createHash('sha256').update(identifier).digest('hex').slice(0, 16);
  const key = `${recoveryClientIp(req)}:${identifierHash}`;
  const current = recoveryRateLimits.get(key);

  if (!current || current.resetAt <= now) {
    recoveryRateLimits.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return;
  }

  if (current.count >= 8) {
    const err = new Error('TOO_MANY_ATTEMPTS_TRY_LATER');
    (err as any).status = 429;
    throw err;
  }

  current.count += 1;
}

function recoveryIdentifierHash(identifier: string) {
  return crypto.createHash('sha256').update(identifier).digest('hex').slice(0, 16);
}

function recoveryLockKey(req: Request, identifierHash: string) {
  return `${recoveryClientIp(req)}:${identifierHash}`;
}

// Bloqueio persistente (atravessa reinicios de desafio): se ja estiver bloqueado, recusa.
function assertRecoveryNotLocked(key: string) {
  const entry = recoveryLockouts.get(key);
  if (!entry) return;
  if (entry.lockedUntil > Date.now()) {
    const err = new Error('RECOVERY_LOCKED');
    (err as any).status = 423;
    throw err;
  }
  // Bloqueio expirou: zera o contador para permitir novo ciclo.
  recoveryLockouts.delete(key);
}

// Registra uma resposta errada. Retorna true se o solicitante acabou de ser bloqueado.
function registerRecoveryFailure(key: string) {
  const now = Date.now();
  const entry = recoveryLockouts.get(key) || { failures: 0, lockedUntil: 0 };
  entry.failures += 1;
  if (entry.failures >= RECOVERY_MAX_ATTEMPTS) {
    entry.lockedUntil = now + RECOVERY_LOCK_MS;
  }
  recoveryLockouts.set(key, entry);
  return entry.lockedUntil > now;
}

function clearRecoveryFailures(key: string) {
  recoveryLockouts.delete(key);
}

// Mascara leve: mantem mais pistas visiveis (2 primeiros + ultimo, poucas estrelas).
function maskMiddle(value: string, minStars = 2) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '*'.repeat(minStars);
  if (normalized.length <= 2) return `${normalized[0]}*`;
  if (normalized.length === 3) return `${normalized.slice(0, 2)}*`;

  const lead = normalized.slice(0, 2);
  const last = normalized[normalized.length - 1];
  const stars = '*'.repeat(Math.max(minStars, Math.min(4, normalized.length - 3)));
  return `${lead}${stars}${last}`;
}

function maskText(value: string) {
  return value
    .replace(/[A-Za-zÀ-ÿ0-9]{2,}/g, (part) => maskMiddle(part, 2))
    .slice(0, 80);
}

function monthName(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

// Mostra o dominio real e mais caracteres do inicio do e-mail (menos censurado).
function maskEmail(email: string) {
  const [localPart, domainPart = ''] = email.trim().toLowerCase().split('@');
  const local = localPart || 'u';
  let maskedLocal: string;
  if (local.length <= 2) maskedLocal = `${local[0]}*`;
  else if (local.length <= 4) maskedLocal = `${local.slice(0, 2)}${'*'.repeat(local.length - 2)}`;
  else maskedLocal = `${local.slice(0, 2)}${'*'.repeat(Math.min(5, local.length - 3))}${local.slice(-1)}`;

  const domain = domainPart || 'email.com';
  return `${maskedLocal}@${domain}`;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = crypto.randomInt(index + 1);
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
  }

  return copy;
}

function recoveryCollection() {
  return getFirebaseAdminFirestore()?.collection('passwordRecoveryChallenges') || null;
}

function pruneMemoryRecoveryChallenges() {
  const now = Date.now();
  recoveryMemoryChallenges.forEach((challenge, id) => {
    if (new Date(challenge.expiresAt).getTime() <= now) {
      recoveryMemoryChallenges.delete(id);
    }
  });
}

async function saveRecoveryChallenge(id: string, challenge: RecoveryChallengeRecord) {
  const collection = recoveryCollection();

  if (!collection) {
    pruneMemoryRecoveryChallenges();
    recoveryMemoryChallenges.set(id, challenge);
    return;
  }

  await collection.doc(id).set({
    ...challenge,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _ts: FieldValue.serverTimestamp(),
  });
}

async function readRecoveryChallenge(id: string) {
  const collection = recoveryCollection();

  if (!collection) {
    pruneMemoryRecoveryChallenges();
    return recoveryMemoryChallenges.get(id) || null;
  }

  const snap = await collection.doc(id).get();
  return snap.exists ? snap.data() as RecoveryChallengeRecord : null;
}

async function updateRecoveryChallenge(id: string, data: Partial<RecoveryChallengeRecord>) {
  const collection = recoveryCollection();

  if (!collection) {
    const current = recoveryMemoryChallenges.get(id);
    if (current) recoveryMemoryChallenges.set(id, { ...current, ...data });
    return;
  }

  await collection.doc(id).set({
    ...data,
    updatedAt: new Date().toISOString(),
    _ts: FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function findRecoveryUser(identifier: string) {
  const email = normalizeRecoveryIdentifier(identifier);
  if (!z.string().email().safeParse(email).success) return { email, user: null };

  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) return { email, user: null };

  try {
    const record = await adminAuth.getUserByEmail(email);
    return { email, user: toFirebaseUserRecord(record) };
  } catch {
    return { email, user: null };
  }
}

async function requestMatchesTrustedDevice(req: Request, user: FirebaseUserRecord) {
  const db = getFirebaseAdminFirestore();
  if (!db) return false;

  try {
    const currentDeviceHash = getRequestDeviceHash(req);
    const snap = await db.collection('users').doc(user.localId).collection('devices').doc(currentDeviceHash).get();
    const device = snap.exists ? snap.data() as { revokedAt?: string | null } : null;
    return Boolean(device && !device.revokedAt);
  } catch {
    return false;
  }
}

async function recoveryFactsForUser(user: FirebaseUserRecord) {
  const facts: { kind: string; label: string; value: string }[] = [];
  const email = user.email || '';
  const name = user.displayName || email.split('@')[0] || '';

  if (email) {
    facts.push({ kind: 'email', label: 'E-mail cadastrado', value: maskEmail(email) });
  }

  if (name) {
    facts.push({ kind: 'name', label: 'Nome de usuário', value: maskText(name) });
  }

  const customPlan = planFromUser(user);
  let activePlanId = customPlan.planId;

  try {
    const stripeAccess = await getStripeAccessForUser(user);
    activePlanId = stripeAccess?.planId || activePlanId;
  } catch {
    // Stripe is optional for the recovery hint; never fail recovery because of billing metadata.
  }

  const planName = activePlanId && Object.prototype.hasOwnProperty.call(BILLING_PLANS, activePlanId)
    ? BILLING_PLANS[activePlanId as keyof typeof BILLING_PLANS].name
    : 'Sem assinatura ativa';
  facts.push({ kind: 'plan', label: 'Plano do último mes', value: maskText(planName) });

  const devices = await publicTrustedDevices(user).catch(() => []);
  const recentDevice = devices[0];
  if (recentDevice?.name) {
    facts.push({ kind: 'device', label: 'Dispositivo reconhecido', value: maskText(recentDevice.name) });
  } else {
    facts.push({ kind: 'device', label: 'Dispositivo reconhecido', value: maskText('Sem dispositivo recente') });
  }

  if (recentDevice?.location && !/nao identificada|rede local/i.test(recentDevice.location)) {
    facts.push({ kind: 'location', label: 'Local de acesso recente', value: maskText(recentDevice.location) });
  } else {
    const createdAt = user.createdAt ? new Date(Number(user.createdAt)) : new Date();
    facts.push({ kind: 'created', label: 'Mes de criacao da conta', value: maskText(monthName(createdAt)) });
  }

  return facts.slice(0, 5);
}

function recoveryDecoys(kind: string, realValue: string) {
  // Decoys gerados a partir de valores plausiveis passando pela MESMA mascara do valor real,
  // para que a opcao correta nunca se destaque pelo estilo de censura.
  const pools: Record<string, string[]> = {
    email: [
      'mariana.alves@gmail.com',
      'carlos.souza@hotmail.com',
      'rafael.lima@outlook.com',
      'julia.santos@gmail.com',
      'bruno.costa@yahoo.com.br',
      'ana.pereira@gmail.com',
    ].map(maskEmail),
    name: ['Mariana Alves', 'Carlos Souza', 'Rafael Lima', 'Julia Santos', 'Bruno Costa', 'Ana Pereira'].map(maskText),
    plan: [
      maskText(BILLING_PLANS.starter.name),
      maskText(BILLING_PLANS.pro.name),
      maskText(BILLING_PLANS.unlimited.name),
      maskText('Sem assinatura ativa'),
      maskText('Assinatura pausada'),
      maskText('Plano em analise'),
    ],
    device: ['Windows - Chrome', 'Android - Chrome', 'iPhone - Safari', 'macOS - Safari', 'Linux - Firefox', 'Windows - Edge'].map(maskText),
    location: ['Sao Paulo, Brasil', 'Rio de Janeiro, Brasil', 'Belo Horizonte, Brasil', 'Curitiba, Brasil', 'Salvador, Brasil', 'Fortaleza, Brasil'].map(maskText),
    created: [
      maskText('janeiro de 2026'),
      maskText('fevereiro de 2026'),
      maskText('marco de 2026'),
      maskText('abril de 2026'),
      maskText('maio de 2026'),
      maskText('junho de 2026'),
      maskText('dezembro de 2025'),
    ],
  };

  const pool = pools[kind] || pools.email;
  return pool.filter((value) => value !== realValue);
}

function fakeRecoveryFacts() {
  return [
    { kind: 'email', label: 'E-mail cadastrado', value: maskEmail('mariana.alves@gmail.com') },
    { kind: 'name', label: 'Nome de usuário', value: maskText('Mariana Alves') },
    { kind: 'plan', label: 'Plano do último mes', value: maskText(BILLING_PLANS.starter.name) },
    { kind: 'device', label: 'Dispositivo reconhecido', value: maskText('Windows - Chrome') },
    { kind: 'created', label: 'Mes de criacao da conta', value: maskText('junho de 2026') },
  ];
}

function buildRecoveryChallenges(facts: { kind: string; label: string; value: string }[]) {
  const availableFacts = facts.length >= 5 ? facts.slice(0, 5) : fakeRecoveryFacts();
  const correctOptionIds: Record<string, string> = {};
  const challenges: RecoveryChallengeItem[] = availableFacts.map((fact) => {
    const challengeId = randomId(10);
    const correctOptionId = randomId(12);
    correctOptionIds[challengeId] = correctOptionId;

    const options: RecoveryOption[] = [
      { id: correctOptionId, value: fact.value },
    ];

    recoveryDecoys(fact.kind, fact.value).slice(0, 8).forEach((value) => {
      if (options.length < 5 && !options.some((option) => option.value === value)) {
        options.push({ id: randomId(12), value });
      }
    });

    while (options.length < 5) {
      options.push({ id: randomId(12), value: maskEmail(`${randomId(2)}@six3.com`) });
    }

    return {
      id: challengeId,
      label: fact.label,
      options: shuffle(options).slice(0, 5),
    };
  });

  return { correctOptionIds, challenges };
}

function assertRecoveryChallengeActive(challenge: RecoveryChallengeRecord | null): asserts challenge is RecoveryChallengeRecord {
  if (!challenge || challenge.passwordResetAt || new Date(challenge.expiresAt).getTime() <= Date.now()) {
    const err = new Error('RECOVERY_EXPIRED');
    (err as any).status = 400;
    throw err;
  }
}

function customClaimsFromUser(user: FirebaseUserRecord) {
  let custom: Record<string, unknown>;

  try {
    custom = user.customAttributes ? JSON.parse(user.customAttributes) : {};
  } catch {
    custom = {};
  }

  return custom;
}

function planFromUser(user: FirebaseUserRecord) {
  const paidEmails = parsePaidEmails();
  const custom = customClaimsFromUser(user);
  const email = (user.email || '').toLowerCase();
  const currentPeriodEnd = typeof custom.currentPeriodEnd === 'string' ? custom.currentPeriodEnd : null;
  const currentPeriodTime = currentPeriodEnd ? Date.parse(currentPeriodEnd) : 0;
  const hasFuturePeriod = currentPeriodEnd ? Number.isFinite(currentPeriodTime) && currentPeriodTime > Date.now() : true;
  const status = (custom.subscriptionStatus === 'active' || paidEmails.has(email)) && hasFuturePeriod ? 'active' : 'unpaid';
  const planId = typeof custom.planId === 'string' ? custom.planId : null;
  const renewalDay = typeof custom.renewalDay === 'number' ? custom.renewalDay : Number(custom.renewalDay || 0) || null;

  return {
    status,
    planId: status === 'active' ? planId : null,
    currentPeriodEnd: status === 'active' ? currentPeriodEnd : null,
    renewalDay: status === 'active' ? renewalDay : null,
  };
}

function getConfiguredAdminEmail() {
  const parsed = z.string().email().safeParse((process.env.ADMIN_EMAIL || '').trim().toLowerCase());
  return parsed.success ? parsed.data : null;
}

function getConfiguredAdminUid() {
  const uid = (process.env.ADMIN_UID || '').trim();
  return uid.length >= 8 ? uid : null;
}

function roleFromUser(user: FirebaseUserRecord): UserRole {
  const adminUid = getConfiguredAdminUid();
  const adminEmail = getConfiguredAdminEmail();
  const userEmail = (user.email || '').trim().toLowerCase();
  const custom = customClaimsFromUser(user);

  if (adminUid && adminEmail && user.localId === adminUid && userEmail === adminEmail) {
    return 'admin';
  }

  if (adminUid && user.localId === adminUid) {
    return 'admin';
  }

  if (adminEmail && user.emailVerified === true && userEmail === adminEmail) {
    return 'admin';
  }

  if (custom.role === 'admin') {
    return 'admin';
  }

  if (custom.role === 'support') {
    return 'support';
  }

  return 'user';
}

async function storedUserProfile(uid: string) {
  const db = getFirebaseAdminFirestore();
  if (!db) return {};

  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return {};

  const data = snap.data() as StoredProfileData;
  return {
    role: data.role === 'support' ? 'support' : undefined,
    companyName: typeof data.companyName === 'string' ? data.companyName : '',
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : '',
    banned: Boolean(data.banned),
    banReason: typeof data.banReason === 'string' ? data.banReason : '',
    bannedAt: typeof data.bannedAt === 'string' ? data.bannedAt : '',
    bannedBy: typeof data.bannedBy === 'string' ? data.bannedBy : '',
    banExpiresAt: typeof data.banExpiresAt === 'string' ? data.banExpiresAt : null,
    banStatus: data.banStatus || (data.banned ? 'active' : undefined),
    banRevokedAt: typeof data.banRevokedAt === 'string' ? data.banRevokedAt : '',
    banRevokedBy: typeof data.banRevokedBy === 'string' ? data.banRevokedBy : '',
  };
}

async function userProfile(user: FirebaseUserRecord, fallbackName = 'Usuário') {
  const plan = planFromUser(user);
  const baseRole = roleFromUser(user);
  const storedProfile = await storedUserProfile(user.localId);
  const role: UserRole = baseRole === 'user' && storedProfile.role === 'support' ? 'support' : baseRole;
  const notificationPreferences = await getNotificationPreferences(user.localId).catch(() => undefined);
  let stripeAccess = null;

  if (role !== 'admin') {
    try {
      stripeAccess = await getStripeAccessForUser(user);
    } catch (error) {
      console.warn('[billing] Could not load Stripe access:', error instanceof Error ? error.message : 'unknown');
    }
  }

  const access = stripeAccess?.subscriptionStatus === 'active' ? stripeAccess : null;

  return {
    uid: user.localId,
    name: user.displayName || fallbackName,
    email: user.email || '',
    role,
    subscriptionStatus: role === 'admin' ? 'active' : access?.subscriptionStatus || plan.status,
    planId: role === 'admin' ? 'unlimited' : access?.planId || plan.planId,
    entitlements: getPlanEntitlements(role === 'admin' ? 'unlimited' : access?.planId || plan.planId),
    currentPeriodEnd: role === 'admin' ? null : access?.currentPeriodEnd || plan.currentPeriodEnd || null,
    renewalDay: role === 'admin' ? null : access?.renewalDay || plan.renewalDay || null,
    companyName: storedProfile.companyName || '',
    avatarUrl: storedProfile.avatarUrl || '',
    banned: Boolean(storedProfile.banned),
    banReason: storedProfile.banReason || '',
    bannedAt: storedProfile.bannedAt || '',
    bannedBy: storedProfile.bannedBy || '',
    banExpiresAt: storedProfile.banExpiresAt || null,
    banStatus: storedProfile.banStatus || (storedProfile.banned ? 'active' : undefined),
    banRevokedAt: storedProfile.banRevokedAt || '',
    banRevokedBy: storedProfile.banRevokedBy || '',
    notificationPreferences,
    createdAt: user.createdAt ? new Date(Number(user.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function userProfileForRequest(req: Request, user: FirebaseUserRecord, fallbackName?: string) {
  return {
    ...(await userProfile(user, fallbackName)),
    trustedDevices: await publicTrustedDevices(user, getRequestDeviceHash(req)),
  };
}

async function sessionFromAuthResponse(auth: FirebaseAuthResponse, req: Request, fallbackName?: string) {
  const initialUser = await getUserFromIdToken(auth.idToken) || {
    localId: auth.localId,
    email: auth.email,
    displayName: auth.displayName || fallbackName,
  };

  await registerTrustedDevice(req, initialUser);
  await assertUserNotBanned(initialUser);

  return {
    token: auth.idToken,
    refreshToken: auth.refreshToken,
    expiresIn: Number(auth.expiresIn || 3600),
    user: await userProfileForRequest(req, initialUser, fallbackName),
  };
}

authRouter.post('/register', async (req, res, next) => {
  let attemptedEmail = attemptedEmailFromBody(req.body);
  try {
    ensureTrustedDeviceSecurityConfigured();
    const data = registerSchema.parse(req.body);
    attemptedEmail = data.email;
    const auth = await firebaseAuthRequest<FirebaseAuthResponse>('accounts:signUp', {
      email: data.email,
      password: data.password,
      displayName: data.name,
      returnSecureToken: true,
    });

    if (data.name) {
      await firebaseAuthRequest('accounts:update', {
        idToken: auth.idToken,
        displayName: data.name,
        returnSecureToken: false,
      });
    }

    await createNotification({
      recipientUid: auth.localId,
      category: 'system',
      title: 'Bem-vindo ao SIX3',
      body: 'Sua conta foi criada. Escolha um plano para liberar a plataforma completa.',
      link: '/app/billing',
      priority: 'normal',
    }).catch((error) => console.warn('[notifications] welcome skipped:', error instanceof Error ? error.message : error));

    const session = await sessionFromAuthResponse(auth, req, data.name);
    await recordAuthAuditLog(req, {
      type: 'register',
      uid: auth.localId,
      email: auth.email || data.email,
      success: true,
    });
    res.status(201).json(session);
  } catch (e) {
    await recordAuthAuditLog(req, {
      type: 'register',
      email: attemptedEmail,
      success: false,
      reason: auditReasonFromError(e),
    });
    next(e);
  }
});

authRouter.post('/login', async (req, res, next) => {
  let attemptedEmail = attemptedEmailFromBody(req.body);
  try {
    ensureTrustedDeviceSecurityConfigured();
    const data = loginSchema.parse(req.body);
    attemptedEmail = data.email;
    const auth = await firebaseAuthRequest<FirebaseAuthResponse>('accounts:signInWithPassword', {
      email: data.email,
      password: data.password,
      returnSecureToken: true,
    });

    const session = await sessionFromAuthResponse(auth, req);
    await recordAuthAuditLog(req, {
      type: 'login',
      uid: auth.localId,
      email: auth.email || data.email,
      success: true,
    });
    res.json(session);
  } catch (e) {
    await recordAuthAuditLog(req, {
      type: 'login',
      email: attemptedEmail,
      success: false,
      reason: auditReasonFromError(e),
    });
    next(e);
  }
});

authRouter.post('/password-reset', async (req, res, next) => {
  let attemptedEmail = attemptedEmailFromBody(req.body);
  try {
    const data = resetSchema.parse(req.body);
    attemptedEmail = data.email;
    await firebaseAuthRequest('accounts:sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email: data.email,
    });
    await recordAuthAuditLog(req, {
      type: 'password_reset',
      email: data.email,
      success: true,
    });
    res.json({ ok: true });
  } catch (e) {
    await recordAuthAuditLog(req, {
      type: 'password_reset',
      email: attemptedEmail,
      success: false,
      reason: auditReasonFromError(e),
    });
    next(e);
  }
});

authRouter.post('/recovery/options', async (req, res, next) => {
  try {
    const data = recoveryOptionsSchema.parse(req.body);
    const identifier = normalizeRecoveryIdentifier(data.identifier);
    const identifierHash = recoveryIdentifierHash(identifier);
    assertRecoveryNotLocked(recoveryLockKey(req, identifierHash));
    assertRecoveryRateLimit(req, identifier);

    const { user } = await findRecoveryUser(identifier);
    const facts = user ? await recoveryFactsForUser(user) : [];
    const { correctOptionIds, challenges } = buildRecoveryChallenges(facts);
    const challengeId = randomId(24);

    await saveRecoveryChallenge(challengeId, {
      uid: user?.localId || '',
      email: user?.email || '',
      identifierHash,
      correctOptionIds,
      attempts: 0,
      expiresAt: new Date(Date.now() + RECOVERY_TTL_MS).toISOString(),
    });

    res.json({
      challengeId,
      expiresIn: Math.floor(RECOVERY_TTL_MS / 1000),
      challenges,
    });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/recovery/verify', async (req, res, next) => {
  try {
    const data = recoveryVerifySchema.parse(req.body);
    const challenge = await readRecoveryChallenge(data.challengeId);
    assertRecoveryChallengeActive(challenge);

    const lockKey = recoveryLockKey(req, challenge.identifierHash || recoveryIdentifierHash(challenge.email));
    assertRecoveryNotLocked(lockKey);

    const expectedSelections = Object.entries(challenge.correctOptionIds || {});
    const selections = data.selections || {};
    const allSelectionsMatch = expectedSelections.length >= 5
      && expectedSelections.every(([challengeItemId, optionId]) => selections[challengeItemId] === optionId);

    if (!allSelectionsMatch) {
      await updateRecoveryChallenge(data.challengeId, { attempts: challenge.attempts + 1 });
      const locked = registerRecoveryFailure(lockKey);
      const err = new Error(locked ? 'RECOVERY_LOCKED' : 'RECOVERY_OPTION_MISMATCH');
      (err as any).status = locked ? 423 : 400;
      throw err;
    }

    // Acertou: limpa o contador de falhas desse solicitante.
    clearRecoveryFailures(lockKey);

    const verifiedAt = new Date().toISOString();

    if (challenge.uid) {
      const resetToken = randomId(32);
      await updateRecoveryChallenge(data.challengeId, {
        verifiedAt,
        resetTokenHash: hashRecoveryToken(data.challengeId, resetToken),
        resetTokenExpiresAt: new Date(Date.now() + RECOVERY_TOKEN_TTL_MS).toISOString(),
      });

      res.json({
        ok: true,
        mode: 'password',
        resetToken,
        expiresIn: Math.floor(RECOVERY_TOKEN_TTL_MS / 1000),
      });
      return;
    }

    await updateRecoveryChallenge(data.challengeId, { verifiedAt });
    res.json({ ok: true, mode: 'support' });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/recovery/password', async (req, res, next) => {
  try {
    const data = recoveredPasswordSchema.parse(req.body);
    const challenge = await readRecoveryChallenge(data.challengeId);
    assertRecoveryChallengeActive(challenge);

    const tokenExpiresAt = challenge.resetTokenExpiresAt ? new Date(challenge.resetTokenExpiresAt).getTime() : 0;
    const tokenHash = hashRecoveryToken(data.challengeId, data.resetToken);
    if (!challenge.uid || !challenge.resetTokenHash || challenge.resetTokenHash !== tokenHash || tokenExpiresAt <= Date.now()) {
      const err = new Error('RECOVERY_EXPIRED');
      (err as any).status = 400;
      throw err;
    }

    const adminAuth = getFirebaseAdminAuth();
    if (!adminAuth) {
      const err = new Error('FIREBASE_ADMIN_REQUIRED');
      (err as any).status = 500;
      throw err;
    }

    await adminAuth.updateUser(challenge.uid, { password: data.newPassword });
    await updateRecoveryChallenge(data.challengeId, {
      passwordResetAt: new Date().toISOString(),
    });

    await createNotification({
      recipientUid: challenge.uid,
      category: 'system',
      title: 'Senha alterada',
      body: 'Sua senha foi redefinida por um dispositivo reconhecido.',
      link: '/login',
      priority: 'high',
    }).catch((error) => console.warn('[notifications] password recovery skipped:', error instanceof Error ? error.message : error));

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    res.json({ user: await userProfileForRequest(req, user) });
  } catch (e) {
    next(e);
  }
});

authRouter.put('/profile', async (req, res, next) => {
  try {
    const idToken = getBearerToken(req.headers.authorization);
    if (!idToken) authError();

    const data = profileSchema.parse(req.body);
    if (data.name) {
      await firebaseAuthRequest('accounts:update', {
        idToken,
        displayName: data.name,
        returnSecureToken: false,
      });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) authError();

    const db = getFirebaseAdminFirestore();
    if (db) {
      await db.collection('users').doc(user.localId).set({
        companyName: data.companyName || '',
        avatarUrl: data.avatarUrl || '',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    res.json({ user: await userProfileForRequest(req, user) });
  } catch (e) {
    next(e);
  }
});

authRouter.put('/password', async (req, res, next) => {
  try {
    const idToken = getBearerToken(req.headers.authorization);
    if (!idToken) authError();

    const data = passwordSchema.parse(req.body);
    await getAuthenticatedUser(req);

    const auth = await firebaseAuthRequest<FirebaseAuthResponse>('accounts:update', {
      idToken,
      password: data.newPassword,
      returnSecureToken: true,
    });

    res.json(await sessionFromAuthResponse(auth, req));
  } catch (e) {
    next(e);
  }
});

authRouter.delete('/devices/:deviceId', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    const deviceId = deviceIdSchema.parse(req.params.deviceId);
    const currentDeviceHash = getRequestDeviceHash(req);

    await disconnectTrustedDevice(user.localId, deviceId);

    res.json({
      ok: true,
      currentDisconnected: deviceId === currentDeviceHash,
      user: await userProfileForRequest(req, user),
    });
  } catch (e) {
    next(e);
  }
});

authRouter.delete('/devices', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    await disconnectAllTrustedDevices(user.localId);

    res.json({
      ok: true,
      currentDisconnected: true,
    });
  } catch (e) {
    next(e);
  }
});

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    const profile = await userProfile(user);

    if (profile.role !== 'admin') {
      authError('FORBIDDEN', 403);
    }

    res.locals.user = profile;
    next();
  } catch (e) {
    next(e);
  }
}

authRouter.get('/admin/session', requireAdmin, (_req, res) => {
  res.json({ ok: true, user: res.locals.user });
});

export async function requireSupportStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);
    const profile = await userProfile(user);

    if (profile.role !== 'admin' && profile.role !== 'support') {
      authError('FORBIDDEN', 403);
    }

    res.locals.user = profile;
    next();
  } catch (e) {
    next(e);
  }
}

export async function requireActiveSubscription(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);

    const profile = await userProfile(user);
    if (profile.role === 'support') {
      authError('FORBIDDEN', 403);
    }

    if (profile.subscriptionStatus !== 'active') {
      const err = new Error('PAYMENT_REQUIRED');
      (err as any).status = 402;
      throw err;
    }

    _res.locals.user = profile;
    next();
  } catch (e) {
    next(e);
  }
}

export function requirePlanFeature(feature: PlanFeature) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getAuthenticatedUser(req);
      const profile = await userProfile(user);

      if (profile.role === 'support') {
        authError('FORBIDDEN', 403);
      }

      if (profile.subscriptionStatus !== 'active') {
        const err = new Error('PAYMENT_REQUIRED');
        (err as any).status = 402;
        throw err;
      }

      if (profile.role !== 'admin' && !hasPlanFeature(profile.planId, feature)) {
        const err = new Error('PLAN_FEATURE_REQUIRED');
        (err as any).status = 403;
        (err as any).code = feature;
        throw err;
      }

      res.locals.user = profile;
      next();
    } catch (e) {
      next(e);
    }
  };
}
