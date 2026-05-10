import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { stripe, PLANS } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook handler.
 *
 * Events handled :
 *   - checkout.session.completed     → marque la sub active
 *   - customer.subscription.updated  → update plan
 *   - customer.subscription.deleted  → downgrade to free
 *   - invoice.paid                   → log + update usedAiCredits reset
 *   - invoice.payment_failed         → planStatus = past_due
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature') || '';
  const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const body = await req.text();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e: any) {
    return NextResponse.json({ error: 'invalid-signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId = session.subscription_data?.metadata?.orgId || session.metadata?.orgId;
        const plan = session.subscription_data?.metadata?.plan || session.metadata?.plan;
        if (orgId && plan && PLANS[plan]) {
          await applyPlan(orgId, plan, session.customer, session.subscription);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const orgId = sub.metadata?.orgId;
        const plan = sub.metadata?.plan || 'solo';
        if (orgId && PLANS[plan]) {
          await applyPlan(orgId, plan, sub.customer, sub.id);
          await platformDb.subscription.updateMany({
            where: { orgId },
            data: {
              currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              cancelAtPeriodEnd: sub.cancel_at_period_end || false,
            },
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const orgId = sub.metadata?.orgId;
        if (orgId) {
          await platformDb.org.update({
            where: { id: orgId },
            data: { plan: 'free', planStatus: 'canceled', ...PLANS.free },
          });
          await platformDb.subscription.deleteMany({ where: { orgId } });
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const orgId = invoice.subscription_details?.metadata?.orgId;
        if (orgId) {
          await platformDb.invoice.create({
            data: {
              orgId,
              amountCents: invoice.amount_paid,
              currency: invoice.currency.toUpperCase(),
              status: 'paid',
              pdfUrl: invoice.invoice_pdf,
              stripeInvoiceId: invoice.id,
              paidAt: new Date(),
            },
          });
          // Reset compteur IA mensuel
          await platformDb.org.update({ where: { id: orgId }, data: { usedAiCredits: 0 } });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const orgId = invoice.subscription_details?.metadata?.orgId;
        if (orgId) {
          await platformDb.org.update({ where: { id: orgId }, data: { planStatus: 'past_due' } });
        }
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error('[stripe-webhook]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function applyPlan(orgId: string, plan: string, customerId: string, subscriptionId: string) {
  const config = PLANS[plan];
  if (!config) return;
  await platformDb.org.update({
    where: { id: orgId },
    data: {
      plan,
      planStatus: 'active',
      maxSites: config.maxSites,
      maxStorageMb: config.maxStorageMb,
      maxAiCredits: config.maxAiCredits,
    },
  });
  await platformDb.subscription.upsert({
    where: { orgId },
    update: {
      stripeCustomerId: customerId,
      stripeSubId: subscriptionId,
      plan,
      amountCents: config.amountCents,
    },
    create: {
      orgId,
      stripeCustomerId: customerId,
      stripeSubId: subscriptionId,
      plan,
      amountCents: config.amountCents,
      currency: 'EUR',
    },
  });
}
