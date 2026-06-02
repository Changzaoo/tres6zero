import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { getAuthenticatedUser, requireAdmin } from './auth';
import {
  activateMonthlyAccess,
  findOrCreateCustomerForUser,
  getPlan,
  getStripe,
  listActivePaidCustomers,
} from '../services/stripeBilling';

export const billingRouter = Router();

type CheckoutSession = Awaited<ReturnType<ReturnType<typeof getStripe>['checkout']['sessions']['create']>>;
type CheckoutSessionParams = Parameters<ReturnType<typeof getStripe>['checkout']['sessions']['create']>[0];

const checkoutSchema = z.object({
  planId: z.enum(['starter', 'pro', 'unlimited']),
});

function frontendUrl() {
  return (process.env.FRONTEND_URL || 'https://six3.vercel.app').replace(/\/+$/, '');
}

async function activateFromCheckoutSession(session: CheckoutSession) {
  const plan = getPlan(session.metadata?.plan_id || '');
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

  if (!plan || !customerId) {
    throw new Error('INVALID_CHECKOUT_SESSION');
  }

  return activateMonthlyAccess(customerId, plan.id, session.id);
}

billingRouter.post('/checkout', async (req, res, next) => {
  try {
    const data = checkoutSchema.parse(req.body);
    const user = await getAuthenticatedUser(req);
    const plan = getPlan(data.planId);

    if (!plan) {
      const err = new Error('INVALID_PLAN');
      (err as any).status = 400;
      throw err;
    }

    if (!user.email) {
      const err = new Error('USER_EMAIL_REQUIRED');
      (err as any).status = 400;
      throw err;
    }

    const stripe = getStripe();
    const customer = await findOrCreateCustomerForUser(user);
    const baseUrl = frontendUrl();

    const checkoutParams: CheckoutSessionParams = {
      mode: 'payment',
      customer: customer.id,
      customer_update: {
        name: 'auto',
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: plan.amount,
            product_data: {
              name: plan.name,
              metadata: {
                plan_id: plan.id,
              },
            },
          },
        },
      ],
      metadata: {
        plan_id: plan.id,
        firebase_uid: user.localId,
        user_email: user.email,
      },
      payment_intent_data: {
        metadata: {
          plan_id: plan.id,
          firebase_uid: user.localId,
          user_email: user.email,
        },
      },
      success_url: `${baseUrl}/app/billing?checkout=success`,
      cancel_url: `${baseUrl}/app/billing?checkout=cancelled`,
    };

    const session = await stripe.checkout.sessions.create(checkoutParams);

    res.json({ url: session.url });
  } catch (e) {
    next(e);
  }
});

billingRouter.get('/admin/customers', requireAdmin, async (_req, res, next) => {
  try {
    res.json({ customers: await listActivePaidCustomers() });
  } catch (e) {
    next(e);
  }
});

export async function stripeWebhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || typeof signature !== 'string') {
      const err = new Error('STRIPE_WEBHOOK_NOT_CONFIGURED');
      (err as any).status = 500;
      throw err;
    }

    const event = getStripe().webhooks.constructEvent(req.body, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as CheckoutSession;
      if (session.payment_status === 'paid') {
        await activateFromCheckoutSession(session);
      }
    }

    if (event.type === 'checkout.session.async_payment_succeeded') {
      await activateFromCheckoutSession(event.data.object as CheckoutSession);
    }

    res.json({ received: true });
  } catch (e) {
    next(e);
  }
}
