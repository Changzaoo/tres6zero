import crypto from 'crypto';
import type { IncomingHttpHeaders } from 'http';
import { FieldValue } from 'firebase-admin/firestore';
import QRCode from 'qrcode';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from './firebaseAdmin';
import { createNotification } from './notifications';
import { getPlan, type AuthenticatedBillingUser, type BillingPlanId } from './stripeBilling';

type PixGoStatus = 'pending' | 'completed' | 'expired' | 'cancelled' | 'refunded' | 'failed';

type StoredPixGoPayment = {
  provider: 'pixgo';
  paymentId: string;
  externalId: string;
  userId: string;
  userEmail: string;
  userName: string;
  planId: BillingPlanId;
  planName: string;
  amount: number;
  amountCents: number;
  status: PixGoStatus;
  pixCode: string | null;
  qrCodeUrl: string | null;
  qrCodeDataUrl: string | null;
  paymentUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  accessGrantedAt?: string | null;
  currentPeriodEnd?: string | null;
  renewalDay?: number | null;
};

type PixGoPaymentData = {
  payment_id?: string;
  id?: string;
  external_id?: string;
  amount?: number;
  status?: string;
  qr_code?: string;
  pix_code?: string;
  copy_paste?: string;
  brcode?: string;
  qr_image_url?: string;
  qr_code_url?: string;
  payment_url?: string;
  checkout_url?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
};

type PixGoWebhookPayload = {
  event?: string;
  timestamp?: string;
  data?: PixGoPaymentData & {
    payment_id?: string;
    external_id?: string;
    completed_at?: string | null;
    expired_at?: string | null;
    refunded_at?: string | null;
  };
};

const memoryPayments = new Map<string, StoredPixGoPayment>();
const PIXGO_PAYMENT_TTL_MS = 20 * 60 * 1000;

function pixgoApiBaseUrl() {
  return (process.env.PIXGO_API_BASE_URL || 'https://pixgo.org/api/v1').replace(/\/+$/, '');
}

function pixgoApiKey() {
  return (
    process.env.PIXGO_API_KEY
    || process.env.PIXGO_API_SECRET_KEY
    || process.env.PIXGO_SECRET_KEY
    || process.env.PIXGO_PUBLIC_KEY
    || ''
  ).trim();
}

function getConfiguredWebhookUrl() {
  const baseUrl = (process.env.PUBLIC_BACKEND_URL || process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/+$/, '');
  return baseUrl ? `${baseUrl}/api/webhooks/pixgo` : undefined;
}

function dbOrNull() {
  return getFirebaseAdminFirestore();
}

function toAmountReais(amountCents: number) {
  return Number((amountCents / 100).toFixed(2));
}

function normalizeStatus(value?: string | null): PixGoStatus {
  const status = String(value || '').toLowerCase();
  if (status === 'completed' || status === 'paid' || status === 'approved') return 'completed';
  if (status === 'expired') return 'expired';
  if (status === 'cancelled' || status === 'canceled') return 'cancelled';
  if (status === 'refunded') return 'refunded';
  if (status === 'failed' || status === 'error') return 'failed';
  return 'pending';
}

function fallbackExpiresAt(baseIso?: string | null) {
  const baseTime = baseIso ? Date.parse(baseIso) : Date.now();
  const safeBaseTime = Number.isFinite(baseTime) ? baseTime : Date.now();
  return new Date(safeBaseTime + PIXGO_PAYMENT_TTL_MS).toISOString();
}

function applyLocalExpiration(record: StoredPixGoPayment): StoredPixGoPayment {
  if (record.status !== 'pending' || !record.expiresAt) return record;
  const expiresAt = Date.parse(record.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt > Date.now()) return record;

  return {
    ...record,
    status: 'expired',
    updatedAt: new Date().toISOString(),
  };
}

function normalizePixGoData(payload: unknown): PixGoPaymentData {
  const raw = payload && typeof payload === 'object' && 'data' in payload
    ? (payload as { data?: unknown }).data
    : payload;
  return raw && typeof raw === 'object' ? raw as PixGoPaymentData : {};
}

function publicPayment(record: StoredPixGoPayment) {
  return {
    provider: record.provider,
    paymentId: record.paymentId,
    externalId: record.externalId,
    planId: record.planId,
    planName: record.planName,
    amount: record.amount,
    status: record.status,
    pixCode: record.pixCode,
    qrCodeUrl: record.qrCodeUrl,
    qrCodeDataUrl: record.qrCodeDataUrl || null,
    paymentUrl: record.paymentUrl,
    expiresAt: record.expiresAt,
    currentPeriodEnd: record.currentPeriodEnd || null,
  };
}

async function qrCodeDataUrlFromPixCode(pixCode?: string | null) {
  if (!pixCode) return null;
  try {
    return await QRCode.toDataURL(pixCode, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: {
        dark: '#08090c',
        light: '#ffffff',
      },
    });
  } catch {
    return null;
  }
}

function createExternalId(userId: string, planId: BillingPlanId) {
  const suffix = crypto.randomBytes(4).toString('hex');
  return `six3_${userId.slice(0, 8)}_${planId}_${Date.now().toString(36)}_${suffix}`.slice(0, 50);
}

async function savePayment(record: StoredPixGoPayment) {
  memoryPayments.set(record.paymentId, record);
  const db = dbOrNull();
  if (!db) return;

  await db.collection('billingPayments').doc(record.paymentId).set({
    ...record,
    _ts: FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function readPayment(paymentId: string) {
  const memory = memoryPayments.get(paymentId);
  const db = dbOrNull();
  if (!db) return memory || null;

  const snap = await db.collection('billingPayments').doc(paymentId).get();
  if (snap.exists) return snap.data() as StoredPixGoPayment;
  return memory || null;
}

async function readPaymentByExternalId(externalId?: string | null) {
  if (!externalId) return null;
  const db = dbOrNull();
  if (!db) {
    return [...memoryPayments.values()].find((payment) => payment.externalId === externalId) || null;
  }

  const snap = await db.collection('billingPayments').where('externalId', '==', externalId).limit(1).get();
  return snap.empty ? null : snap.docs[0].data() as StoredPixGoPayment;
}

function addOneMonthOnDay(date: Date, anchorDay: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + 1, Math.min(anchorDay, lastDayOfTargetMonth), hour, minute, second, ms));
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

async function activatePixGoPayment(record: StoredPixGoPayment, sourceEventId?: string) {
  if (record.accessGrantedAt && record.currentPeriodEnd) return record;

  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    const err = new Error('FIREBASE_ADMIN_REQUIRED');
    (err as any).status = 500;
    throw err;
  }

  const user = await adminAuth.getUser(record.userId);
  const currentClaims = user.customClaims || {};
  const now = new Date();
  const currentEnd = parseDate(typeof currentClaims.currentPeriodEnd === 'string' ? currentClaims.currentPeriodEnd : record.currentPeriodEnd);
  const periodStart = currentEnd && currentEnd > now ? currentEnd : now;
  const renewalDay = Number(currentClaims.renewalDay || record.renewalDay || periodStart.getUTCDate()) || periodStart.getUTCDate();
  const nextEnd = addOneMonthOnDay(periodStart, renewalDay);
  const accessGrantedAt = now.toISOString();

  await adminAuth.setCustomUserClaims(record.userId, {
    ...currentClaims,
    subscriptionStatus: 'active',
    planId: record.planId,
    billingProvider: 'pixgo',
    currentPeriodEnd: nextEnd.toISOString(),
    renewalDay,
  });

  const db = dbOrNull();
  if (db) {
    await db.collection('users').doc(record.userId).set({
      subscriptionStatus: 'active',
      planId: record.planId,
      billingProvider: 'pixgo',
      pixgoPaymentId: record.paymentId,
      currentPeriodEnd: nextEnd.toISOString(),
      planExpiresAt: nextEnd.toISOString(),
      renewalDay,
      updatedAt: accessGrantedAt,
      _ts: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  const updated: StoredPixGoPayment = {
    ...record,
    status: 'completed',
    paidAt: record.paidAt || accessGrantedAt,
    accessGrantedAt,
    currentPeriodEnd: nextEnd.toISOString(),
    renewalDay,
    updatedAt: accessGrantedAt,
  };
  await savePayment(updated);

  await createNotification({
    recipientUid: record.userId,
    category: 'billing',
    title: 'Pagamento Pix confirmado',
    body: `Seu plano ${record.planName} está ativo até ${nextEnd.toLocaleDateString('pt-BR')}.`,
    link: '/app/billing',
    priority: 'high',
    metadata: { provider: 'pixgo', pixgoPaymentId: record.paymentId, sourceEventId, planId: record.planId },
  }).catch((error) => console.warn('[notifications] pixgo billing skipped:', error instanceof Error ? error.message : error));

  return updated;
}

export async function createPixGoPayment(user: AuthenticatedBillingUser, planId: BillingPlanId) {
  const plan = getPlan(planId);
  if (!plan) {
    const err = new Error('INVALID_PLAN');
    (err as any).status = 400;
    throw err;
  }

  const apiKey = pixgoApiKey();
  if (!apiKey) {
    const err = new Error('PIXGO_NOT_CONFIGURED');
    (err as any).status = 500;
    throw err;
  }

  const externalId = createExternalId(user.localId, plan.id);
  const webhookUrl = getConfiguredWebhookUrl();
  const requestBody: Record<string, unknown> = {
    amount: toAmountReais(plan.amount),
    description: `Plano ${plan.name} - SIX3`,
    customer_name: user.displayName || user.email || 'Usuário SIX3',
    customer_email: user.email || undefined,
    external_id: externalId,
    webhook_url: webhookUrl,
  };

  Object.keys(requestBody).forEach((key) => {
    if (requestBody[key] === undefined || requestBody[key] === '') delete requestBody[key];
  });

  const response = await fetch(`${pixgoApiBaseUrl()}/payment/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || (payload as any)?.success === false) {
    const err = new Error((payload as any)?.message || (payload as any)?.error || 'PIXGO_CREATE_PAYMENT_FAILED');
    (err as any).status = 502;
    (err as any).code = (payload as any)?.error || 'PIXGO_CREATE_PAYMENT_FAILED';
    throw err;
  }

  const data = normalizePixGoData(payload);
  const paymentId = data.payment_id || data.id;
  if (!paymentId) {
    const err = new Error('PIXGO_PAYMENT_ID_MISSING');
    (err as any).status = 502;
    throw err;
  }

  const now = new Date().toISOString();
  const pixCode = data.qr_code || data.pix_code || data.copy_paste || data.brcode || null;
  const record: StoredPixGoPayment = {
    provider: 'pixgo',
    paymentId,
    externalId: data.external_id || externalId,
    userId: user.localId,
    userEmail: user.email || '',
    userName: user.displayName || user.email || 'Usuário SIX3',
    planId: plan.id,
    planName: plan.name,
    amount: typeof data.amount === 'number' ? data.amount : toAmountReais(plan.amount),
    amountCents: plan.amount,
    status: normalizeStatus(data.status),
    pixCode,
    qrCodeUrl: data.qr_image_url || data.qr_code_url || null,
    qrCodeDataUrl: await qrCodeDataUrlFromPixCode(pixCode),
    paymentUrl: data.payment_url || data.checkout_url || null,
    expiresAt: data.expires_at || fallbackExpiresAt(now),
    createdAt: now,
    updatedAt: now,
  };

  await savePayment(record);
  return publicPayment(record);
}

export async function getPixGoPaymentStatus(paymentId: string, user: AuthenticatedBillingUser) {
  const stored = await readPayment(paymentId);
  if (!stored || stored.userId !== user.localId) {
    const err = new Error('PIXGO_PAYMENT_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const locallyExpired = applyLocalExpiration(stored);
  if (locallyExpired.status === 'expired' && stored.status !== 'expired') {
    await savePayment(locallyExpired);
    return publicPayment(locallyExpired);
  }

  const apiKey = pixgoApiKey();
  if (!apiKey) return publicPayment(locallyExpired);

  const response = await fetch(`${pixgoApiBaseUrl()}/payment/${encodeURIComponent(paymentId)}/status`, {
    headers: { 'X-API-Key': apiKey },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload as any)?.success === false) return publicPayment(stored);

  const data = normalizePixGoData(payload);
  const pixCode = data.qr_code || data.pix_code || data.copy_paste || data.brcode || stored.pixCode;
  const updated: StoredPixGoPayment = {
    ...locallyExpired,
    status: normalizeStatus(data.status),
    pixCode,
    qrCodeUrl: data.qr_image_url || data.qr_code_url || stored.qrCodeUrl,
    qrCodeDataUrl: stored.qrCodeDataUrl || await qrCodeDataUrlFromPixCode(pixCode),
    paymentUrl: data.payment_url || data.checkout_url || stored.paymentUrl,
    expiresAt: data.expires_at || locallyExpired.expiresAt || fallbackExpiresAt(locallyExpired.createdAt),
    updatedAt: new Date().toISOString(),
  };

  const expiringUpdated = applyLocalExpiration(updated);
  await savePayment(expiringUpdated);
  return publicPayment(expiringUpdated.status === 'completed' ? await activatePixGoPayment(expiringUpdated, 'status-check') : expiringUpdated);
}

function getHeader(headers: IncomingHttpHeaders, name: string) {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function timingSafeEqualHex(expected: string, received: string) {
  try {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(received, 'hex');
    return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

export async function handlePixGoWebhook(rawBody: Buffer, headers: IncomingHttpHeaders) {
  const secret = (process.env.PIXGO_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    const err = new Error('PIXGO_WEBHOOK_NOT_CONFIGURED');
    (err as any).status = 500;
    throw err;
  }

  const timestamp = getHeader(headers, 'x-webhook-timestamp');
  const signature = getHeader(headers, 'x-webhook-signature');
  if (!timestamp || !signature) {
    const err = new Error('PIXGO_WEBHOOK_SIGNATURE_REQUIRED');
    (err as any).status = 401;
    throw err;
  }

  const raw = rawBody.toString('utf8');
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
  if (!timingSafeEqualHex(expected, signature)) {
    const err = new Error('PIXGO_WEBHOOK_INVALID_SIGNATURE');
    (err as any).status = 401;
    throw err;
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
    const err = new Error('PIXGO_WEBHOOK_TIMESTAMP_EXPIRED');
    (err as any).status = 401;
    throw err;
  }

  const payload = JSON.parse(raw) as PixGoWebhookPayload;
  const paymentId = payload.data?.payment_id;
  const externalId = payload.data?.external_id;
  const eventType = payload.event || getHeader(headers, 'x-webhook-event') || 'unknown';
  const eventId = crypto.createHash('sha256').update(`${eventType}:${timestamp}:${paymentId || externalId || raw}`).digest('hex');
  const now = new Date().toISOString();
  const db = dbOrNull();

  if (db) {
    const eventRef = db.collection('pixgoWebhookEvents').doc(eventId);
    const eventSnap = await eventRef.get();
    if (eventSnap.exists) return { received: true, duplicate: true };

    await eventRef.set({
      eventId,
      eventType,
      paymentId: paymentId || null,
      externalId: externalId || null,
      receivedAt: now,
      payload,
      _ts: FieldValue.serverTimestamp(),
    });
  }

  const stored = paymentId ? await readPayment(paymentId) : await readPaymentByExternalId(externalId);
  if (!stored) return { received: true, missingPayment: true };

  const status = normalizeStatus(payload.data?.status || (eventType.includes('completed') ? 'completed' : eventType.replace('payment.', '')));
  const updated: StoredPixGoPayment = {
    ...stored,
    status,
    paidAt: status === 'completed' ? payload.data?.completed_at || now : stored.paidAt || null,
    updatedAt: now,
  };

  await savePayment(updated);
  if (status === 'completed') {
    return { received: true, payment: publicPayment(await activatePixGoPayment(updated, eventId)) };
  }

  return { received: true, payment: publicPayment(updated) };
}
