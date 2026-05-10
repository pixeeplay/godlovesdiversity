import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { stripe, PLANS } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/billing/checkout
 * Body: { plan: 'solo'|'pro'|'agency' }
 *
 * Crée une Stripe Checkout Session et retourne l'URL.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const plan = body.plan as 'solo' | 'pro' | 'agency';
  const planConfig = PLANS[plan];
  if (!planConfig?.priceId) return NextResponse.json({ error: 'invalid-plan' }, { status: 400 });

  const org = await platformDb.org.findUnique({
    where: { id: auth.membership.org.id },
    select: { id: true, slug: true, name: true, subscription: true },
  });
  if (!org) return NextResponse.json({ error: 'org-not-found' }, { status: 404 });

  // Récupère ou crée Stripe customer
  let stripeCustomerId = org.subscription?.stripeCustomerId;
  if (!stripeCustomerId) {
    const user = await platformDb.user.findUnique({ where: { id: auth.userId }, select: { email: true, name: true } });
    const customer = await stripe.customers.create({
      email: user?.email,
      name: user?.name || org.name,
      metadata: { orgId: org.id, orgSlug: org.slug },
    });
    stripeCustomerId = customer.id;
  }

  const baseUrl = process.env.ADMIN_URL || `https://app.pixeesite.com`;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/orgs/${orgSlug}/billing?success=1`,
    cancel_url: `${baseUrl}/dashboard/orgs/${orgSlug}/billing?canceled=1`,
    automatic_tax: { enabled: true },
    customer_update: { address: 'auto' },
    subscription_data: {
      metadata: { orgId: org.id, orgSlug: org.slug, plan },
    },
  });

  return NextResponse.json({ ok: true, url: session.url });
}
