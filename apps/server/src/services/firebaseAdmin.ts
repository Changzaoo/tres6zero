import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, UserRecord } from 'firebase-admin/auth';

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error('missing required fields');
    }

    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  } catch (error) {
    const err = new Error('FIREBASE_SERVICE_ACCOUNT_JSON_INVALID');
    (err as any).status = 500;
    throw err;
  }
}

export function getFirebaseAdminAuth() {
  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) return null;

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
  }

  return getAuth();
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
