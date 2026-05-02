import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { notify } from '@/lib/notify';

/**
 * Crée une commande + redirige vers le checkout choisi (Stripe ou Square).
 * Body : { items: [{ productId, quantity, variant? }], email, name?, phone?, shippingAddress?, provider: 'stripe'|'square' }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [];
  const email = String(body.email || '').trim();
  const provider = body.provider === 'square' ? 'square' : 'stripe';

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  }
  if (items.length === 0) {
    return NextResponse.json({ error: 'Panier vide' }, { status: 400 });
  }

  // Récupérer les produits + variants + calculer le total côté serveur (sécurité)
  const productIds: string[] = items.map((it: any) => String(it.productId)).filter(Boolean);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, published: true },
    include: { productVariants: true }
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let total = 0;
  const orderItemsData: any[] = [];
  for (const it of items) {
    const p = productMap.get(it.productId);
    if (!p) continue;
    const qty = Math.max(1, Math.min(99, Number(it.quantity) || 1));

    // Si un variant est précisé et qu'on trouve un ProductVariant correspondant, on prend SON prix
    let unitPrice = p.priceCents;
    if (it.variant && typeof it.variant === 'object' && p.productVariants?.length > 0) {
      const matched = p.productVariants.find((pv) =>
        pv.published && pv.options && JSON.stringify(pv.options) === JSON.stringify(it.variant)
      );
      if (matched && matched.priceCents !== null) unitPrice = matched.priceCents;
    }

    total += unitPrice * qty;
    orderItemsData.push({ productId: p.id, quantity: qty, priceCents: unitPrice, variant: it.variant || null });
  }
  if (total === 0) return NextResponse.json({ error: 'Produits invalides' }, { status: 400 });

  // Crée la commande PENDING
  const order = await prisma.order.create({
    data: {
      email,
      name: body.name || null,
      phone: body.phone || null,
      shippingAddress: body.shippingAddress || null,
      totalCents: total,
      currency: 'EUR',
      status: 'PENDING',
      paymentProvider: provider === 'square' ? 'SQUARE' : 'STRIPE',
      items: { create: orderItemsData }
    },
    include: { items: { include: { product: true } } }
  });

  // Notification multi-canal (Telegram/Slack/Discord/Webhook si configurés)
  void notify({
    event: 'order.created',
    title: `Nouvelle commande #${order.id.slice(0, 8).toUpperCase()}`,
    body: `${order.email}${order.name ? ` (${order.name})` : ''} · ${order.items.length} article${order.items.length > 1 ? 's' : ''} · ${(total / 100).toFixed(2)} €`,
    url: `${req.nextUrl.origin}/admin/shop/orders/${order.id}`,
    level: 'success'
  });

  const settings = await getSettings([
    'integrations.stripe.secretKey',
    'integrations.stripe.publicKey',
    'integrations.square.accessToken',
    'integrations.square.locationId',
    'integrations.square.environment'
  ]).catch(() => ({} as Record<string, string>));

  const origin = req.nextUrl.origin;

  if (provider === 'stripe') {
    const stripeKey = settings['integrations.stripe.secretKey'] || process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({
        error: 'Stripe non configuré',
        orderId: order.id,
        message: 'L\'admin recevra ta commande et reviendra vers toi pour le paiement.'
      }, { status: 200 });
    }
    // Créer la session Stripe Checkout
    try {
      const lineItems = order.items.map((it) => ({
        price_data: {
          currency: 'eur',
          product_data: { name: it.product.title },
          unit_amount: it.priceCents
        },
        quantity: it.quantity
      }));
      const params = new URLSearchParams();
      params.append('mode', 'payment');
      params.append('success_url', `${origin}/boutique/merci?order=${order.id}`);
      params.append('cancel_url', `${origin}/panier`);
      params.append('customer_email', email);
      params.append('client_reference_id', order.id);
      lineItems.forEach((li, i) => {
        params.append(`line_items[${i}][price_data][currency]`, li.price_data.currency);
        params.append(`line_items[${i}][price_data][product_data][name]`, li.price_data.product_data.name);
        params.append(`line_items[${i}][price_data][unit_amount]`, String(li.price_data.unit_amount));
        params.append(`line_items[${i}][quantity]`, String(li.quantity));
      });
      const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });
      const j = await r.json();
      if (j.url) {
        await prisma.order.update({ where: { id: order.id }, data: { paymentId: j.id } });
        return NextResponse.json({ url: j.url, orderId: order.id });
      }
      return NextResponse.json({ error: j.error?.message || 'Stripe error', orderId: order.id }, { status: 500 });
    } catch (e: any) {
      return NextResponse.json({ error: e.message, orderId: order.id }, { status: 500 });
    }
  }

  // SQUARE
  const squareToken = settings['integrations.square.accessToken'] || process.env.SQUARE_ACCESS_TOKEN;
  const locationId = settings['integrations.square.locationId'] || process.env.SQUARE_LOCATION_ID;
  const env = settings['integrations.square.environment'] || process.env.SQUARE_ENV || 'sandbox';
  const apiBase = env === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';

  if (!squareToken || !locationId) {
    return NextResponse.json({ error: 'Square non configuré', orderId: order.id }, { status: 200 });
  }

  try {
    const r = await fetch(`${apiBase}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${squareToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-04-17'
      },
      body: JSON.stringify({
        idempotency_key: order.id + '-' + Date.now(),
        quick_pay: {
          name: `Commande GLD #${order.id.slice(0, 8)}`,
          price_money: { amount: total, currency: 'EUR' },
          location_id: locationId
        },
        checkout_options: {
          redirect_url: `${origin}/boutique/merci?order=${order.id}`,
          ask_for_shipping_address: true
        },
        pre_populated_data: { buyer_email: email }
      })
    });
    const j = await r.json();
    const url = j.payment_link?.url;
    if (url) {
      await prisma.order.update({ where: { id: order.id }, data: { paymentId: j.payment_link.id } });
      return NextResponse.json({ url, orderId: order.id });
    }
    return NextResponse.json({ error: j.errors?.[0]?.detail || 'Square error', orderId: order.id }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, orderId: order.id }, { status: 500 });
  }
}
