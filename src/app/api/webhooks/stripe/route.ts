import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // crypto.timingSafeEqual

/**
 * Webhook Stripe — confirme les paiements et déclenche la suite de la commande.
 *
 * Setup :
 *  1. Sur Stripe Dashboard → Developers → Webhooks → Add endpoint
 *     URL : https://gld.pixeeplay.com/api/webhooks/stripe
 *     Events : checkout.session.completed, checkout.session.async_payment_succeeded,
 *              checkout.session.async_payment_failed, payment_intent.payment_failed
 *  2. Copier le Signing secret (commence par whsec_…)
 *  3. /admin/settings → Stripe → Webhook Secret = ce secret
 *
 * Vérification : on calcule HMAC SHA-256 de `${timestamp}.${rawBody}` avec le secret,
 * puis on compare en timing-safe avec la signature reçue dans Stripe-Signature.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text(); // RAW pour signature
  const sig = req.headers.get('stripe-signature') || '';

  const cfg = await getSettings([
    'integrations.stripe.webhookSecret',
    'integrations.stripe.secretKey'
  ]).catch(() => ({} as Record<string, string>));

  const secret = cfg['integrations.stripe.webhookSecret'] || process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret non configuré (Stripe → /admin/settings)' }, { status: 500 });
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

  try {
    switch (type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const orderId = obj.client_reference_id || obj.metadata?.orderId;
        if (!orderId) break;
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
            paymentId: obj.payment_intent || obj.id
          },
          include: { items: { include: { product: true } } }
        }).catch(() => null);

        if (order) {
          void notify({
            event: 'order.paid',
            title: `💸 Paiement reçu — commande #${order.id.slice(0, 8).toUpperCase()}`,
            body: `${order.email}${order.name ? ` (${order.name})` : ''} · ${(order.totalCents / 100).toFixed(2)} €`,
            url: `${req.nextUrl.origin}/admin/shop/orders/${order.id}`,
            level: 'success'
          });
        }
        break;
      }

      case 'checkout.session.async_payment_failed':
      case 'payment_intent.payment_failed': {
        const orderId = obj.client_reference_id || obj.metadata?.orderId;
        if (!orderId) break;
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED', notes: `Paiement Stripe échoué : ${obj.last_payment_error?.message || 'inconnu'}` }
        }).catch(() => null);
        void notify({
          event: 'order.failed',
          title: `❌ Paiement Stripe échoué`,
          body: `Order #${orderId.slice(0, 8)} · raison: ${obj.last_payment_error?.message || 'inconnu'}`,
          level: 'error'
        });
        break;
      }

      case 'charge.refunded':
      case 'charge.refund.updated': {
        const piId = obj.payment_intent;
        if (piId) {
          await prisma.order.updateMany({
            where: { paymentId: piId },
            data: { status: 'REFUNDED' }
          }).catch(() => null);
        }
        break;
      }

      // Évents non gérés mais accusés réception → 200 sinon Stripe retentent
      default: break;
    }
  } catch (e: any) {
    // Ne JAMAIS renvoyer 500 sans accusé — Stripe boucle. On log seulement.
    console.error('[stripe webhook]', type, e?.message);
  }

  return NextResponse.json({ received: true, type });
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
