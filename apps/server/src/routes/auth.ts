import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';

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
  displayName?: string;
  customAttributes?: string;
  createdAt?: string;
};

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

async function getUserFromIdToken(idToken: string) {
  const lookup = await firebaseAuthRequest<{ users: FirebaseUserRecord[] }>('accounts:lookup', { idToken });
  return lookup.users?.[0];
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

function userProfile(user: FirebaseUserRecord, fallbackName = 'Usuário') {
  const plan = planFromUser(user);
  return {
    uid: user.localId,
    name: user.displayName || fallbackName,
    email: user.email || '',
    role: 'operator',
    subscriptionStatus: plan.status,
    planId: plan.planId,
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
    user: userProfile(user, fallbackName),
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
    const idToken = getBearerToken(req.headers.authorization);
    if (!idToken) {
      const err = new Error('AUTH_REQUIRED');
      (err as any).status = 401;
      throw err;
    }

    const user = await getUserFromIdToken(idToken);
    if (!user) {
      const err = new Error('AUTH_REQUIRED');
      (err as any).status = 401;
      throw err;
    }

    res.json({ user: userProfile(user) });
  } catch (e) {
    next(e);
  }
});

authRouter.put('/profile', async (req, res, next) => {
  try {
    const idToken = getBearerToken(req.headers.authorization);
    if (!idToken) {
      const err = new Error('AUTH_REQUIRED');
      (err as any).status = 401;
      throw err;
    }

    const data = profileSchema.parse(req.body);
    if (data.name) {
      await firebaseAuthRequest('accounts:update', {
        idToken,
        displayName: data.name,
        returnSecureToken: false,
      });
    }

    const user = await getUserFromIdToken(idToken);
    if (!user) {
      const err = new Error('AUTH_REQUIRED');
      (err as any).status = 401;
      throw err;
    }

    res.json({
      user: {
        ...userProfile(user),
        companyName: data.companyName,
      },
    });
  } catch (e) {
    next(e);
  }
});

export async function requireActiveSubscription(req: Request, _res: Response, next: NextFunction) {
  try {
    const idToken = getBearerToken(req.headers.authorization);
    if (!idToken) {
      const err = new Error('AUTH_REQUIRED');
      (err as any).status = 401;
      throw err;
    }

    const user = await getUserFromIdToken(idToken);
    if (!user) {
      const err = new Error('AUTH_REQUIRED');
      (err as any).status = 401;
      throw err;
    }

    const profile = userProfile(user);
    if (profile.subscriptionStatus !== 'active') {
      const err = new Error('PAYMENT_REQUIRED');
      (err as any).status = 402;
      throw err;
    }

    next();
  } catch (e) {
    next(e);
  }
}
