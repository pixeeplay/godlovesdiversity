import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/connect/premium/webhook — Stripe events
 * Met à jour ConnectPremium selon customer.subscription.* events.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  let event: any;
  try { event = JSON.parse(body); } catch { return NextResponse.json({ error: 'invalid' }, { status: 400 }); }

  // En prod il faudrait valider la signature Stripe, on simplifie pour MVP
  const obj = event?.data?.object;
  if (!obj) return NextResponse.json({ ok: true });

  const customerId = obj.customer as string | undefined;
  if (!customerId) return NextResponse.json({ ok: true });

  const premium = await prisma.connectPremium.findFirst({ where: { stripeCustomerId: customerId } });
  if (!premium) return NextResponse.json({ ok: true });

  const updates: any = {};
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      updates.stripeSubId = obj.id;
      updates.status = obj.status; // active, trialing, past_due, canceled
      updates.currentPeriodEnd = obj.current_period_end ? new Date(obj.current_period_end * 1000) : null;
      updates.trialEndsAt = obj.trial_end ? new Date(obj.trial_end * 1000) : null;
      updates.cancelAtPeriodEnd = !!obj.cancel_at_period_end;
      break;
    case 'customer.subscription.deleted':
      updates.status = 'canceled';
      break;
  }

  if (Object.keys(updates).length > 0) {
    await prisma.connectPremium.update({ where: { id: premium.id }, data: updates });
  }
  return NextResponse.json({ ok: true });
}
