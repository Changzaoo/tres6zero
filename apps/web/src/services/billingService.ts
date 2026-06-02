import { API_URL } from '@/config/api';
import { deviceHeaders, getAuthToken } from '@/services/authService';
import type { PlanId } from '@/config/plans';

type CheckoutResponse = {
  url: string;
};

export async function createCheckout(planId: PlanId) {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...deviceHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ planId }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.url) {
    throw new Error(payload?.error || payload?.code || 'CHECKOUT_ERROR');
  }

  return payload as CheckoutResponse;
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
