import Stripe from 'stripe';

export type BillingPlanId = 'starter' | 'pro' | 'unlimited';

type StripeClient = Stripe.Stripe;
type StripeCustomer = {
  id: string;
  email: string | null;
  name?: string | null;
  metadata: Record<string, string>;
};

export type AuthenticatedBillingUser = {
  localId: string;
  email?: string;
  displayName?: string;
};

export type BillingAccess = {
  subscriptionStatus: 'unpaid' | 'active';
  planId: BillingPlanId | null;
  currentPeriodEnd: string | null;
  renewalDay: number | null;
  stripeCustomerId: string | null;
};

export const BILLING_PLANS: Record<BillingPlanId, { name: string; amount: number }> = {
  starter: { name: 'Essencial 360', amount: 6999 },
  pro: { name: 'Profissional', amount: 12999 },
  unlimited: { name: 'Ilimitado 360', amount: 19999 },
};

let stripeClient: StripeClient | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const err = new Error('STRIPE_NOT_CONFIGURED');
    (err as any).status = 500;
    throw err;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function getPlan(planId: string): { id: BillingPlanId; name: string; amount: number } | null {
  if (!Object.prototype.hasOwnProperty.call(BILLING_PLANS, planId)) return null;
  const id = planId as BillingPlanId;
  return { id, ...BILLING_PLANS[id] };
}

function toUnixSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function fromUnixSeconds(value?: string) {
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000);
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

function activeAccessFromCustomer(customer: StripeCustomer): BillingAccess {
  const periodEnd = fromUnixSeconds(customer.metadata.access_expires_at);
  const now = new Date();
  const planId = getPlan(customer.metadata.plan_id || '')?.id || null;
  const isActive = Boolean(periodEnd && periodEnd > now && planId);

  return {
    subscriptionStatus: isActive ? 'active' : 'unpaid',
    planId: isActive ? planId : null,
    currentPeriodEnd: isActive && periodEnd ? periodEnd.toISOString() : null,
    renewalDay: isActive ? Number(customer.metadata.renewal_day || periodEnd?.getUTCDate() || 0) || null : null,
    stripeCustomerId: customer.id,
  };
}

export async function findCustomerForUser(user: AuthenticatedBillingUser) {
  if (!isStripeConfigured() || !user.email) return null;

  const stripe = getStripe();
  const customers = await stripe.customers.list({ email: user.email, limit: 100 });
  return customers.data.find((customer) => customer.metadata.firebase_uid === user.localId) || null;
}

export async function findOrCreateCustomerForUser(user: AuthenticatedBillingUser) {
  const stripe = getStripe();
  const existing = await findCustomerForUser(user);
  if (existing) return existing;

  return stripe.customers.create({
    email: user.email,
    name: user.displayName,
    metadata: {
      firebase_uid: user.localId,
      source: 'tres6zero',
    },
  });
}

export async function getStripeAccessForUser(user: AuthenticatedBillingUser): Promise<BillingAccess | null> {
  const customer = await findCustomerForUser(user);
  return customer ? activeAccessFromCustomer(customer) : null;
}

export async function activateMonthlyAccess(customerId: string, planId: BillingPlanId, checkoutSessionId: string) {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);

  if ('deleted' in customer && customer.deleted) {
    throw new Error('STRIPE_CUSTOMER_DELETED');
  }

  const activeCustomer = customer as StripeCustomer;

  if (activeCustomer.metadata.last_checkout_session_id === checkoutSessionId) {
    const currentEnd = fromUnixSeconds(activeCustomer.metadata.access_expires_at);
    return {
      planId,
      currentPeriodEnd: currentEnd?.toISOString() || null,
      renewalDay: Number(activeCustomer.metadata.renewal_day || currentEnd?.getUTCDate() || 0) || null,
    };
  }

  const now = new Date();
  const currentEnd = fromUnixSeconds(activeCustomer.metadata.access_expires_at);
  const periodStart = currentEnd && currentEnd > now ? currentEnd : now;
  const renewalDay = Number(activeCustomer.metadata.renewal_day || periodStart.getUTCDate());
  const nextEnd = addOneMonthOnDay(periodStart, renewalDay);

  await stripe.customers.update(customerId, {
    metadata: {
      ...activeCustomer.metadata,
      subscription_status: 'active',
      plan_id: planId,
      access_started_at: activeCustomer.metadata.access_started_at || String(toUnixSeconds(now)),
      access_expires_at: String(toUnixSeconds(nextEnd)),
      last_paid_at: String(toUnixSeconds(now)),
      renewal_day: String(renewalDay),
      last_checkout_session_id: checkoutSessionId,
    },
  });

  return {
    planId,
    currentPeriodEnd: nextEnd.toISOString(),
    renewalDay,
  };
}

export async function listActivePaidCustomers() {
  if (!isStripeConfigured()) return [];

  const stripe = getStripe();
  const customers = await stripe.customers.list({ limit: 100 });

  return customers.data
    .map((customer) => {
      const access = activeAccessFromCustomer(customer);
      if (access.subscriptionStatus !== 'active') return null;

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        planId: access.planId,
        currentPeriodEnd: access.currentPeriodEnd,
        renewalDay: access.renewalDay,
      };
    })
    .filter(Boolean);
}
