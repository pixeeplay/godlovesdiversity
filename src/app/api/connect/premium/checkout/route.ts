import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireConnectUser } from '@/lib/connect';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/connect/premium/checkout
 * Crée une session Stripe Checkout pour l'abonnement Premium 5€/mois.
 * Retourne { url } à rediriger côté client.
 */
export async function POST(req: NextRequest) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });

  const setting = await prisma.setting.findUnique({ where: { key: 'integrations.stripe.secretKey' } }).catch(() => null);
  const stripeKey = setting?.value || process.env.STRIPE_SECRET_KEY;
  const priceId = (await prisma.setting.findUnique({ where: { key: 'connect.premium.priceId' } }).catch(() => null))?.value || process.env.STRIPE_PRICE_PREMIUM;
  if (!stripeKey || !priceId) {
    return NextResponse.json({ error: 'Stripe non configuré (manque secret key ou price ID Premium dans /admin/settings)' }, { status: 503 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gld.pixeeplay.com';

  // Crée ou récupère le customer Stripe
  let premium = await prisma.connectPremium.findUnique({ where: { userId: u.id } });
  let customerId = premium?.stripeCustomerId;
  if (!customerId) {
    const customerR = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: u.email, 'metadata[userId]': u.id })
    });
    const customer = await customerR.json();
    if (customer.error) return NextResponse.json({ error: customer.error.message }, { status: 500 });
    customerId = customer.id;
    if (!premium) {
      premium = await prisma.connectPremium.create({ data: { userId: u.id, stripeCustomerId: customerId } });
    } else {
      await prisma.connectPremium.update({ where: { userId: u.id }, data: { stripeCustomerId: customerId } });
    }
  }

  // Session Checkout
  const sessR = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      mode: 'subscription',
      customer: customerId!,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${baseUrl}/connect/premium/success`,
      cancel_url: `${baseUrl}/connect/rencontres`,
      'subscription_data[trial_period_days]': '7',
      allow_promotion_codes: 'true'
    })
  });
  const sess = await sessR.json();
  if (sess.error) return NextResponse.json({ error: sess.error.message }, { status: 500 });
  return NextResponse.json({ url: sess.url });
}
