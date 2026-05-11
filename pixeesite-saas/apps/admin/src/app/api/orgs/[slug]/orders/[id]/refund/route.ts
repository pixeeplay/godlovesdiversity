import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/orders/[id]/refund
 * body: { amountCents?: number }  // si absent → remboursement total restant
 *
 * Utilise la clé Stripe spécifique à l'org via OrgSecret('STRIPE_SECRET_KEY').
 * Met à jour refundedCents / refundedAt et bascule le statut à `refunded`
 * si le remboursement couvre la totalité du restant.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const orgId = auth.membership.org.id;
  const stripeKey = await getOrgSecret(orgId, 'STRIPE_SECRET_KEY');
  if (!stripeKey) return NextResponse.json({ error: 'STRIPE_SECRET_KEY non configurée' }, { status: 400 });

  const db = await getTenantPrisma(slug);
  const order = await db.order.findUnique({ where: { id } }).catch(() => null);
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!order.externalId) return NextResponse.json({ error: 'Pas de paiement Stripe lié à cette commande' }, { status: 400 });

  const body = await req.json().catch(() => ({} as any));
  const refundedSoFar = order.refundedCents || 0;
  const remaining = Math.max(0, (order.totalCents || 0) - refundedSoFar);
  if (remaining <= 0) return NextResponse.json({ error: 'Commande déjà entièrement remboursée' }, { status: 400 });

  const askedAmount = typeof body.amountCents === 'number' && body.amountCents > 0
    ? Math.min(body.amountCents, remaining)
    : remaining;

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: order.externalId,
      amount: askedAmount,
      reason: body.reason || undefined,
      metadata: { orderId: order.id, orgSlug: slug },
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Stripe : ${e?.message || 'refund failed'}` }, { status: 500 });
  }

  const newRefunded = refundedSoFar + askedAmount;
  const fullyRefunded = newRefunded >= (order.totalCents || 0);

  const updated = await db.order.update({
    where: { id },
    data: {
      refundedCents: newRefunded,
      refundedAt: new Date(),
      status: fullyRefunded ? 'refunded' : order.status,
      notes: `${order.notes || ''}\n[Refund] ${new Date().toISOString()} ${(askedAmount/100).toFixed(2)} ${order.currency} via ${refund.id}`.trim(),
    },
  });

  return NextResponse.json({ ok: true, refund: { id: refund.id, amount: refund.amount, status: refund.status }, order: updated });
}
