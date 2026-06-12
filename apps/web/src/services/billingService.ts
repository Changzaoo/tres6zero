import { API_URL } from '@/config/api';
import { deviceHeaders, getAuthToken } from '@/services/authService';
import type { PlanId } from '@/config/plans';

export type PixPayment = {
  provider: 'pixgo';
  paymentId: string;
  externalId: string;
  planId: PlanId;
  planName: string;
  amount: number;
  status: 'pending' | 'completed' | 'expired' | 'cancelled' | 'refunded' | 'failed';
  pixCode: string | null;
  qrCodeUrl: string | null;
  qrCodeDataUrl?: string | null;
  paymentUrl: string | null;
  expiresAt: string | null;
  currentPeriodEnd?: string | null;
};

export async function createPixPayment(planId: PlanId, payer: { document: string; name?: string }) {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/pixgo/create-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...deviceHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      planId,
      payerDocument: payer.document,
      payerName: payer.name || undefined,
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.payment) {
    throw new Error(payload?.error || payload?.code || 'PIX_PAYMENT_ERROR');
  }

  return payload.payment as PixPayment;
}

export async function getPixPayment(paymentId: string) {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/pixgo/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      ...deviceHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.payment) {
    throw new Error(payload?.error || payload?.code || 'PIX_PAYMENT_STATUS_ERROR');
  }

  return payload.payment as PixPayment;
}

export async function getPaidCustomers() {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/admin/customers`, {
    headers: {
      ...deviceHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || payload?.code || 'ADMIN_BILLING_ERROR');
  }

  return payload as {
    customers: {
      id: string;
      name: string | null;
      email: string | null;
      planId: PlanId | null;
      currentPeriodEnd: string | null;
      renewalDay: number | null;
    }[];
  };
}
