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
import { createPixGoPayment, getPixGoPaymentStatus, handlePixGoWebhook } from '../services/pixgoBilling';
import { createNotification } from '../services/notifications';

export const billingRouter = Router();

type CheckoutSession = Awaited<ReturnType<ReturnType<typeof getStripe>['checkout']['sessions']['create']>>;
type CheckoutSessionParams = Parameters<ReturnType<typeof getStripe>['checkout']['sessions']['create']>[0];

const checkoutSchema = z.object({
  planId: z.enum(['starter', 'pro', 'unlimited']),
});

const pixgoPaymentSchema = z.object({
  planId: z.enum(['starter', 'pro', 'unlimited']),
  // CPF (11 dígitos) ou CNPJ (14) de quem vai pagar o Pix; obrigatório pela
  // PixGo a partir de 25/06/2026. Aceita máscara; o serviço valida o DV.
  payerDocument: z.string().trim().min(11).max(20),
  payerName: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().min(1).max(120).optional(),
  ),
});

function frontendUrl() {
  return (process.env.FRONTEND_URL || 'https://six3.nexusholding.xyz').replace(/\/+$/, '');
}

async function activateFromCheckoutSession(session: CheckoutSession) {
  const plan = getPlan(session.metadata?.plan_id || '');
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

  if (!plan || !customerId) {
    throw new Error('INVALID_CHECKOUT_SESSION');
  }

  const access = await activateMonthlyAccess(customerId, plan.id, session.id);
  const firebaseUid = session.metadata?.firebase_uid;

  if (firebaseUid) {
    await createNotification({
      recipientUid: firebaseUid,
      category: 'billing',
      title: 'Pagamento confirmado',
      body: `Seu plano ${plan.name} está ativo até ${access.currentPeriodEnd ? new Date(access.currentPeriodEnd).toLocaleDateString('pt-BR') : 'o próximo ciclo'}.`,
      link: '/app/billing',
      priority: 'high',
      metadata: { checkoutSessionId: session.id, planId: plan.id },
    }).catch((error) => console.warn('[notifications] billing skipped:', error instanceof Error ? error.message : error));
  }

  return access;
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
      excluded_payment_method_types: ['boleto'],
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

billingRouter.post('/pixgo/create-payment', async (req, res, next) => {
  try {
    const data = pixgoPaymentSchema.parse(req.body);
    const user = await getAuthenticatedUser(req);
    res.status(201).json({
      payment: await createPixGoPayment(user, data.planId, {
        document: data.payerDocument,
        name: data.payerName,
      }),
    });
  } catch (e) {
    next(e);
  }
});

billingRouter.get('/pixgo/payments/:paymentId', async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req);
    res.json({ payment: await getPixGoPaymentStatus(req.params.paymentId, user) });
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

export async function pixgoWebhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    res.json(await handlePixGoWebhook(rawBody, req.headers));
  } catch (e) {
    next(e);
  }
}
