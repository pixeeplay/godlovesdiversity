import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

/** Mapping plan slug → Stripe price ID + limits du plan */
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
  free: {
    priceId: '',
    amountCents: 0,
    maxSites: 1,
    maxStorageMb: 100,
    maxAiCredits: 50,
    customDomains: false,
    abTest: false,
    codeExport: false,
  },
  solo: {
    priceId: process.env.STRIPE_PRICE_SOLO || '',
    amountCents: 1400,
    maxSites: 1,
    maxStorageMb: 5_000,
    maxAiCredits: 500,
    customDomains: true,
    abTest: false,
    codeExport: false,
  },
  pro: {
    priceId: process.env.STRIPE_PRICE_PRO || '',
    amountCents: 3900,
    maxSites: 3,
    maxStorageMb: 20_000,
    maxAiCredits: 2_000,
    customDomains: true,
    abTest: true,
    codeExport: true,
  },
  agency: {
    priceId: process.env.STRIPE_PRICE_AGENCY || '',
    amountCents: 9900,
    maxSites: 25,
    maxStorageMb: 100_000,
    maxAiCredits: 10_000,
    customDomains: true,
    abTest: true,
    codeExport: true,
  },
};
