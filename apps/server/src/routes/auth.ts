import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { getStripeAccessForUser } from '../services/stripeBilling';
import { getPlanEntitlements, hasPlanFeature, type PlanFeature } from '../services/planEntitlements';
import { getFirebaseAdminAuth, toFirebaseUserRecord } from '../services/firebaseAdmin';

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

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  companyName: z.string().optional(),
});

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

function roleFromUser(user: FirebaseUserRecord): UserRole {
  const adminEmail = getConfiguredAdminEmail();
  const userEmail = (user.email || '').trim().toLowerCase();

  if (adminEmail && user.emailVerified === true && userEmail === adminEmail) {
    return 'admin';
  }

  return 'user';
}

async function userProfile(user: FirebaseUserRecord, fallbackName = 'Usuário') {
  const plan = planFromUser(user);
  const role = roleFromUser(user);
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
    createdAt: user.createdAt ? new Date(Number(user.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function sessionFromAuthResponse(auth: FirebaseAuthResponse, fallbackName?: string) {
  const user = await getUserFromIdToken(auth.idToken) || {
    localId: auth.localId,
    email: auth.email,
    displayName: auth.displayName || fallbackName,
  };

  return {
    token: auth.idToken,
    refreshToken: auth.refreshToken,
    expiresIn: Number(auth.expiresIn || 3600),
    user: await userProfile(user, fallbackName),
  };
}

authRouter.post('/register', async (req, res, next) => {
  try {
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

    res.status(201).json(await sessionFromAuthResponse(auth, data.name));
  } catch (e) {
    next(e);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const auth = await firebaseAuthRequest<FirebaseAuthResponse>('accounts:signInWithPassword', {
      email: data.email,
      password: data.password,
      returnSecureToken: true,
    });

    res.json(await sessionFromAuthResponse(auth));
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

authRouter.get('/me', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    res.json({ user: await userProfile(user) });
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

    const user = await getUserFromIdToken(idToken);
    if (!user) authError();

    res.json({
      user: {
        ...(await userProfile(user)),
        companyName: data.companyName,
      },
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
