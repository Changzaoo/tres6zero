import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type ServiceAccount = {
  project_id?: string;
  projectId?: string;
  client_email?: string;
  clientEmail?: string;
  private_key?: string;
  privateKey?: string;
};

type ParsedServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  source: string;
};

const placeholderPattern = /^(cole_|your_|replace_|placeholder|todo)/i;

function envValue(name: string) {
  const value = process.env[name]?.trim();
  return value && !placeholderPattern.test(value) ? value : '';
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, '\n');
}

function configError(message: string): never {
  const err = new Error(message);
  (err as any).status = 500;
  (err as any).code = message;
  throw err;
}

function normalizeServiceAccount(parsed: ServiceAccount, source: string): ParsedServiceAccount {
  const projectId = parsed.project_id || parsed.projectId;
  const clientEmail = parsed.client_email || parsed.clientEmail;
  const privateKey = parsed.private_key || parsed.privateKey;

  if (!projectId || !clientEmail || !privateKey) {
    configError(`${source}_MISSING_REQUIRED_FIELDS`);
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
    source,
  };
}

function parseServiceAccountJson(raw: string, source: string) {
  try {
    return normalizeServiceAccount(JSON.parse(raw) as ServiceAccount, source);
  } catch (error) {
    if (error instanceof Error && error.message.endsWith('_MISSING_REQUIRED_FIELDS')) {
      throw error;
    }

    configError(`${source}_INVALID`);
  }
}

function parseBase64ServiceAccount() {
  const raw = envValue('FIREBASE_SERVICE_ACCOUNT_JSON_BASE64');
  if (!raw) return null;

  try {
    return parseServiceAccountJson(Buffer.from(raw, 'base64').toString('utf8'), 'FIREBASE_SERVICE_ACCOUNT_JSON_BASE64');
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('FIREBASE_SERVICE_ACCOUNT_JSON_BASE64_')) {
      throw error;
    }

    configError('FIREBASE_SERVICE_ACCOUNT_JSON_BASE64_INVALID');
  }
}

function parseJsonServiceAccount() {
  const raw = envValue('FIREBASE_SERVICE_ACCOUNT_JSON');
  return raw ? parseServiceAccountJson(raw, 'FIREBASE_SERVICE_ACCOUNT_JSON') : null;
}

function parseSplitServiceAccount() {
  const clientEmail = envValue('FIREBASE_CLIENT_EMAIL');
  const privateKey = envValue('FIREBASE_PRIVATE_KEY');
  if (!clientEmail && !privateKey) return null;

  const projectId = envValue('FIREBASE_PROJECT_ID') || envValue('GOOGLE_CLOUD_PROJECT') || envValue('VITE_FIREBASE_PROJECT_ID');

  return normalizeServiceAccount({
    projectId,
    clientEmail,
    privateKey,
  }, 'FIREBASE_SERVICE_ACCOUNT_SPLIT_ENV');
}

function parseServiceAccount() {
  return parseBase64ServiceAccount() || parseJsonServiceAccount() || parseSplitServiceAccount();
}

function getFirebaseAdminApp(): App | null {
  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) return null;

  if (getApps().length > 0) return getApps()[0];

  const { projectId, clientEmail, privateKey } = serviceAccount;
  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

export function getFirebaseAdminAuth() {
  const app = getFirebaseAdminApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseAdminFirestore() {
  const app = getFirebaseAdminApp();
  return app ? getFirestore(app) : null;
}

export function getFirebaseAdminConfigStatus() {
  try {
    const serviceAccount = parseServiceAccount();
    return {
      configured: Boolean(serviceAccount),
      source: serviceAccount?.source || null,
      error: null,
    };
  } catch (error) {
    return {
      configured: false,
      source: null,
      error: error instanceof Error ? error.message : 'FIREBASE_ADMIN_CONFIG_INVALID',
    };
  }
}

export function toFirebaseUserRecord(record: UserRecord) {
  return {
    localId: record.uid,
    email: record.email,
    emailVerified: record.emailVerified,
    displayName: record.displayName,
    customAttributes: record.customClaims ? JSON.stringify(record.customClaims) : undefined,
    createdAt: record.metadata.creationTime ? String(new Date(record.metadata.creationTime).getTime()) : undefined,
  };
}
