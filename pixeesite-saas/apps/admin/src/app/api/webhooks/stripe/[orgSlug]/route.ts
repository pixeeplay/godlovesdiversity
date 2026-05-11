import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { platformDb, getTenantPrisma } from '@pixeesite/database';
import { getOrgSecret } from '@/lib/secrets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Webhook Stripe multi-tenant.
 *
 * Setup (par org) :
 *  1. Stripe Dashboard → Developers → Webhooks → Add endpoint
 *     URL : https://<admin-domain>/api/webhooks/stripe/<orgSlug>
 *     Events : checkout.session.completed, checkout.session.async_payment_succeeded,
 *              checkout.session.async_payment_failed, charge.refunded, charge.refund.updated
 *  2. Copier le Signing secret → enregistré dans OrgSecret STRIPE_WEBHOOK_SECRET de l'org.
 *
 * Vérification HMAC SHA-256 comme dans Stripe SDK.
 *
 * Flow :
 *   - checkout.session.completed → CREATE Order si absente, sinon update status=paid.
 *   - payment_failed → status=cancelled
 *   - charge.refunded → status=refunded (sync avec ce qu'on a déjà fait côté UI)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;

  // Vérifie org existe
  const org = await platformDb.org.findUnique({ where: { slug: orgSlug }, select: { id: true, slug: true } });
  if (!org) return NextResponse.json({ error: 'org not found' }, { status: 404 });

  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  const secret = await getOrgSecret(org.id, 'STRIPE_WEBHOOK_SECRET');
  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET non configuré pour cette org' }, { status: 500 });
  }

  const verified = verifyStripeSignature(rawBody, sig, secret);
  if (!verified.ok) {
    return NextResponse.json({ error: `Signature invalide : ${verified.reason}` }, { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }

  const type = event.type as string;
  const obj = event.data?.object || {};
  const db = await getTenantPrisma(orgSlug);

  try {
    switch (type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        // Stripe Checkout session
        const sessionId = obj.id as string | undefined;
        const paymentIntentId = (obj.payment_intent as string | undefined) || obj.id;
        const amount = obj.amount_total ?? obj.amount ?? 0;
        const currency = (obj.currency || 'eur').toUpperCase();
        const email = obj.customer_details?.email || obj.customer_email || 'unknown@example.com';
        const name = obj.customer_details?.name || '';
        const shipping = obj.shipping_details || obj.shipping || obj.customer_details?.address;
        const metadata = obj.metadata || {};

        // Existe déjà ?
        let order = sessionId
          ? await db.order.findFirst({ where: { OR: [{ stripeSessionId: sessionId }, { externalId: paymentIntentId }] } }).catch(() => null)
          : null;

        if (order) {
          await db.order.update({
            where: { id: order.id },
            data: { status: 'paid', externalId: paymentIntentId, stripeSessionId: sessionId },
          });
        } else {
          const [firstName, ...rest] = (name || '').split(' ');
          const address = shipping?.address || {};
          await db.order.create({
            data: {
              externalId: paymentIntentId,
              stripeSessionId: sessionId,
              email,
              firstName: firstName || null,
              lastName: rest.join(' ') || null,
              phone: obj.customer_details?.phone || null,
              shipAddress: [address.line1, address.line2].filter(Boolean).join('\n') || null,
              shipCity: address.city || null,
              shipPostal: address.postal_code || null,
              shipCountry: address.country || null,
              totalCents: amount,
              currency,
              status: 'paid',
              items: metadata.items ? safeParseJson(metadata.items) : [],
              metadata: metadata as any,
            },
          });
        }
        break;
      }

      case 'checkout.session.async_payment_failed':
      case 'payment_intent.payment_failed': {
        const sessionId = obj.id as string | undefined;
        const paymentIntentId = obj.payment_intent || obj.id;
        const reason = obj.last_payment_error?.message || 'inconnu';
        await db.order.updateMany({
          where: { OR: [{ stripeSessionId: sessionId || '___' }, { externalId: paymentIntentId }] },
          data: { status: 'cancelled', notes: `Paiement Stripe échoué : ${reason}` },
        }).catch(() => null);
        break;
      }

      case 'charge.refunded':
      case 'charge.refund.updated': {
        const piId = obj.payment_intent as string | undefined;
        const refundedTotal = obj.amount_refunded ?? 0;
        if (piId) {
          const order = await db.order.findFirst({ where: { externalId: piId } }).catch(() => null);
          if (order) {
            const isFull = refundedTotal >= (order.totalCents || 0);
            await db.order.update({
              where: { id: order.id },
              data: {
                refundedCents: refundedTotal || order.refundedCents,
                refundedAt: new Date(),
                status: isFull ? 'refunded' : order.status,
              },
            });
          }
        }
        break;
      }

      default: break;
    }
  } catch (e: any) {
    // Toujours répondre 200 sinon Stripe bouclera
    console.error('[stripe webhook]', orgSlug, type, e?.message);
  }

  return NextResponse.json({ received: true, type });
}

function safeParseJson(s: string): any {
  try { return JSON.parse(s); } catch { return []; }
}

function verifyStripeSignature(payload: string, header: string, secret: string): { ok: boolean; reason?: string } {
  if (!header) return { ok: false, reason: 'header absent' };
  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k, v];
    })
  );
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return { ok: false, reason: 'header malformé' };

  // Tolérance temporelle 5 min pour éviter replay
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(t, 10)) > 300) return { ok: false, reason: 'timestamp trop ancien' };

  const signedPayload = `${t}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(v1, 'hex');
    if (a.length !== b.length) return { ok: false, reason: 'longueur mismatch' };
    if (!crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'HMAC mismatch' };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'erreur crypto' };
  }
}
