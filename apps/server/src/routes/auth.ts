import crypto from 'crypto';
import { NextFunction, Request, Response, Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { BILLING_PLANS, getStripeAccessForUser } from '../services/stripeBilling';
import { getPlanEntitlements, hasPlanFeature, type PlanFeature } from '../services/planEntitlements';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore, toFirebaseUserRecord } from '../services/firebaseAdmin';
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

type UserRole = 'admin' | 'user';

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
const recoveryMemoryChallenges = new Map<string, RecoveryChallengeRecord>();
const recoveryRateLimits = new Map<string, { count: number; resetAt: number }>();

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
    const decoded = await adminAuth.verifyIdToken(idToken);
    const record = await adminAuth.getUser(decoded.uid);
    return toFirebaseUserRecord(record);
  }

  const lookup = await firebaseAuthRequest<{ users: FirebaseUserRecord[] }>('accounts:lookup', { idToken });
  return lookup.users?.[0];
}

export async function getAuthenticatedUser(req: Request) {
  const idToken = getBearerToken(req.headers.authorization);
  if (!idToken) authError();

  const user = await getUserFromIdToken(idToken);
  if (!user) authError();

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

function maskMiddle(value: string, minStars = 5) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '*'.repeat(minStars);
  if (normalized.length === 1) return `${normalized}${'*'.repeat(minStars)}`;

  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  const stars = '*'.repeat(Math.max(minStars, Math.min(10, normalized.length - 2)));
  return `${first}${stars}${last}`;
}

function maskText(value: string) {
  return value
    .replace(/[A-Za-z0-9]{2,}/g, (part) => maskMiddle(part, 4))
    .slice(0, 80);
}

function monthName(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function maskEmail(email: string) {
  const [localPart, domainPart = ''] = email.trim().toLowerCase().split('@');
  const domainParts = domainPart.split('.').filter(Boolean);
  const suffix = domainParts.length > 1 ? `.${domainParts[domainParts.length - 1]}` : '';
  const domainRoot = domainParts.length > 1 ? domainParts.slice(0, -1).join('.') : domainPart;
  const maskedDomain = '*'.repeat(Math.max(6, Math.min(12, domainRoot.length || 6)));

  return `${maskMiddle(localPart || 'u')}@${maskedDomain}${suffix}`;
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
    facts.push({ kind: 'name', label: 'Nome de usuario', value: maskText(name) });
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
  facts.push({ kind: 'plan', label: 'Plano do ultimo mes', value: maskText(planName) });

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
  const pools: Record<string, string[]> = {
    email: [
      'a*****5@******.com',
      'm*****2@******.com',
      'c*****9@******.com',
      'v*****7@******.com',
      'r*****4@******.com',
      's*****8@******.com',
    ],
    name: ['V******s', 'A****n', 'M*****a', 'C*****s', 'R*****l', 'L*****a'],
    plan: [
      maskText(BILLING_PLANS.starter.name),
      maskText(BILLING_PLANS.pro.name),
      maskText(BILLING_PLANS.unlimited.name),
      maskText('Sem assinatura ativa'),
      maskText('Assinatura pausada'),
      maskText('Plano em analise'),
    ],
    device: [
      'W******s - C****e',
      'A*****d - C****e',
      'i****e - S****i',
      'm***S - S****i',
      'L***x - F*****x',
      'W******s - E**e',
    ],
    location: [
      'S** P****, B****l',
      'R** d* J******, B****l',
      'B********e, B****l',
      'C******a, B****l',
      'S******r, B****l',
      'F***********s, B****l',
    ],
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
    { kind: 'email', label: 'E-mail cadastrado', value: 'a*****5@******.com' },
    { kind: 'name', label: 'Nome de usuario', value: 'V******s' },
    { kind: 'plan', label: 'Plano do ultimo mes', value: maskText(BILLING_PLANS.starter.name) },
    { kind: 'device', label: 'Dispositivo reconhecido', value: 'W******s - C****e' },
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

function planFromUser(user: FirebaseUserRecord) {
  const paidEmails = parsePaidEmails();
  let custom: Record<string, unknown>;

  try {
    custom = user.customAttributes ? JSON.parse(user.customAttributes) : {};
  } catch {
    custom = {};
  }

  const email = (user.email || '').toLowerCase();
  const status = custom.subscriptionStatus === 'active' || paidEmails.has(email) ? 'active' : 'unpaid';
  const planId = typeof custom.planId === 'string' ? custom.planId : null;

  return { status, planId };
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

  if (adminUid && adminEmail) {
    return user.localId === adminUid && userEmail === adminEmail ? 'admin' : 'user';
  }

  if (adminUid) {
    return user.localId === adminUid ? 'admin' : 'user';
  }

  if (adminEmail && user.emailVerified === true && userEmail === adminEmail) {
    return 'admin';
  }

  return 'user';
}

async function storedUserProfile(uid: string) {
  const db = getFirebaseAdminFirestore();
  if (!db) return {};

  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return {};

  const data = snap.data() as { companyName?: string; avatarUrl?: string };
  return {
    companyName: typeof data.companyName === 'string' ? data.companyName : '',
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : '',
  };
}

async function userProfile(user: FirebaseUserRecord, fallbackName = 'Usuário') {
  const plan = planFromUser(user);
  const role = roleFromUser(user);
  const storedProfile = await storedUserProfile(user.localId);
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
    currentPeriodEnd: role === 'admin' ? null : access?.currentPeriodEnd || null,
    renewalDay: role === 'admin' ? null : access?.renewalDay || null,
    companyName: storedProfile.companyName || '',
    avatarUrl: storedProfile.avatarUrl || '',
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

  return {
    token: auth.idToken,
    refreshToken: auth.refreshToken,
    expiresIn: Number(auth.expiresIn || 3600),
    user: await userProfileForRequest(req, initialUser, fallbackName),
  };
}

authRouter.post('/register', async (req, res, next) => {
  try {
    ensureTrustedDeviceSecurityConfigured();
    const data = registerSchema.parse(req.body);
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

    res.status(201).json(await sessionFromAuthResponse(auth, req, data.name));
  } catch (e) {
    next(e);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    ensureTrustedDeviceSecurityConfigured();
    const data = loginSchema.parse(req.body);
    const auth = await firebaseAuthRequest<FirebaseAuthResponse>('accounts:signInWithPassword', {
      email: data.email,
      password: data.password,
      returnSecureToken: true,
    });

    res.json(await sessionFromAuthResponse(auth, req));
  } catch (e) {
    next(e);
  }
});

authRouter.post('/password-reset', async (req, res, next) => {
  try {
    const data = resetSchema.parse(req.body);
    await firebaseAuthRequest('accounts:sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email: data.email,
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/recovery/options', async (req, res, next) => {
  try {
    const data = recoveryOptionsSchema.parse(req.body);
    const identifier = normalizeRecoveryIdentifier(data.identifier);
    assertRecoveryRateLimit(req, identifier);

    const { user } = await findRecoveryUser(identifier);
    const facts = user ? await recoveryFactsForUser(user) : [];
    const { correctOptionIds, challenges } = buildRecoveryChallenges(facts);
    const challengeId = randomId(24);

    await saveRecoveryChallenge(challengeId, {
      uid: user?.localId || '',
      email: user?.email || '',
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

    if (challenge.attempts >= RECOVERY_MAX_ATTEMPTS) {
      const err = new Error('TOO_MANY_ATTEMPTS_TRY_LATER');
      (err as any).status = 429;
      throw err;
    }

    const expectedSelections = Object.entries(challenge.correctOptionIds || {});
    const selections = data.selections || {};
    const allSelectionsMatch = expectedSelections.length >= 5
      && expectedSelections.every(([challengeItemId, optionId]) => selections[challengeItemId] === optionId);

    if (!allSelectionsMatch) {
      await updateRecoveryChallenge(data.challengeId, { attempts: challenge.attempts + 1 });
      const err = new Error('RECOVERY_OPTION_MISMATCH');
      (err as any).status = 400;
      throw err;
    }

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

export async function requireActiveSubscription(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req);

    const profile = await userProfile(user);
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
