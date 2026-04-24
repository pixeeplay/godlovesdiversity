import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSettings } from '@/lib/settings';

/**
 * Crée un Payment Link Square et renvoie l'URL de checkout.
 * L'utilisateur est redirigé vers une page hébergée par Square qui supporte
 * nativement Apple Pay, Google Pay, CB, sans SDK client.
 *
 * Doc : https://developer.squareup.com/docs/checkout-api/create-payment-links
 * Clés requises (dans /admin/settings ou .env) :
 *   - integrations.square.accessToken (ou SQUARE_ACCESS_TOKEN)
 *   - integrations.square.locationId (ou SQUARE_LOCATION_ID)
 *   - integrations.square.environment (ou SQUARE_ENVIRONMENT) : "sandbox" | "production"
 */
export const runtime = 'nodejs';

const ZERO_DECIMAL: Record<string, boolean> = { JPY: true, KRW: true, VND: true, CLP: true };

export async function POST(req: Request) {
  const { amount, currency = 'EUR', note } = await req.json();
  if (!amount || amount < 1 || amount > 5000) {
    return NextResponse.json({ error: 'Montant invalide (1 à 5000)' }, { status: 400 });
  }

  const s = await getSettings([
    'integrations.square.accessToken',
    'integrations.square.locationId',
    'integrations.square.environment'
  ]).catch(() => ({} as Record<string, string>));

  const accessToken = s['integrations.square.accessToken'] || process.env.SQUARE_ACCESS_TOKEN;
  const locationId = s['integrations.square.locationId'] || process.env.SQUARE_LOCATION_ID;
  const env = s['integrations.square.environment'] || process.env.SQUARE_ENVIRONMENT || 'sandbox';

  if (!accessToken || !locationId) {
    return NextResponse.json(
      { error: 'Clés Square non configurées. Va dans /admin/settings → section Square.' },
      { status: 400 }
    );
  }

  const base = env === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gld.pixeeplay.com';

  // Square utilise les plus petites unités (centimes pour EUR)
  const multiplier = ZERO_DECIMAL[currency] ? 1 : 100;
  const amountCents = Math.round(amount * multiplier);

  try {
    const r = await fetch(`${base}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-10-17',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        quick_pay: {
          name: `Don à God Loves Diversity — ${amount} ${currency}`,
          price_money: { amount: amountCents, currency },
          location_id: locationId
        },
        checkout_options: {
          redirect_url: `${siteUrl}/merci?amount=${amount}&currency=${currency}`,
          ask_for_shipping_address: false,
          accepted_payment_methods: {
            apple_pay: true,
            google_pay: true,
            cash_app_pay: true,
            afterpay_clearpay: false
          },
          allow_tipping: true,
          merchant_support_email: process.env.ADMIN_EMAIL
        },
        note: note || `Don de soutien au mouvement God Loves Diversity`
      })
    });
    const j = await r.json();
    if (!r.ok) {
      console.error('Square error:', j);
      return NextResponse.json({ error: j.errors?.[0]?.detail || 'Erreur Square', raw: j }, { status: 500 });
    }
    return NextResponse.json({ ok: true, url: j.payment_link?.url, id: j.payment_link?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur réseau Square' }, { status: 500 });
  }
}
