import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/** Lazy-init Stripe pour ne pas crasher au build sans la clé. */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(key, { apiVersion: '2024-11-20.acacia' });
  }
  return _stripe;
}

/** Backwards-compat : `stripe` proxy qui forward vers getStripe(). */
export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return (getStripe() as any)[prop];
  },
});

export const PLANS: Record<string, {
  priceId: string;
  amountCents: number;
  maxSites: number;
  maxStorageMb: number;
  maxAiCredits: number;
  customDomains: boolean;
  abTest: boolean;
  codeExport: boolean;
}> = {
  free: { priceId: '', amountCents: 0, maxSites: 1, maxStorageMb: 100, maxAiCredits: 50, customDomains: false, abTest: false, codeExport: false },
  solo: { priceId: process.env.STRIPE_PRICE_SOLO || '', amountCents: 1400, maxSites: 1, maxStorageMb: 5_000, maxAiCredits: 500, customDomains: true, abTest: false, codeExport: false },
  pro: { priceId: process.env.STRIPE_PRICE_PRO || '', amountCents: 3900, maxSites: 3, maxStorageMb: 20_000, maxAiCredits: 2_000, customDomains: true, abTest: true, codeExport: true },
  agency: { priceId: process.env.STRIPE_PRICE_AGENCY || '', amountCents: 9900, maxSites: 25, maxStorageMb: 100_000, maxAiCredits: 10_000, customDomains: true, abTest: true, codeExport: true },
};
