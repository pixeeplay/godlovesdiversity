import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/billing/portal
 * Crée une session Stripe Customer Portal et retourne l'URL.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const sub = await platformDb.subscription.findUnique({ where: { orgId: auth.membership.org.id } });
  if (!sub?.stripeCustomerId) return NextResponse.json({ error: 'no-customer' }, { status: 400 });

  const baseUrl = process.env.ADMIN_URL || `https://app.pixeesite.com`;
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${baseUrl}/dashboard/orgs/${orgSlug}/billing`,
  });
  return NextResponse.json({ ok: true, url: portal.url });
}
