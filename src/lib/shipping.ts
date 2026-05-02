/**
 * Tarifs expédition (mise à jour janvier 2026, France métropolitaine).
 * Sources : tarifs publics La Poste / Mondial Relay / Chronopost.
 *
 * Pour des étiquettes officielles avec compte pro, brancher l'API SOAP Colissimo
 * (https://www.colissimo.entreprise.laposte.fr/api) — nécessite un contrat.
 * Ici on fournit les tarifs publics + l'URL de suivi standardisée.
 */

export type CarrierId = 'colissimo' | 'colissimo-international' | 'mondial-relay' | 'chronopost' | 'pickup';

export const CARRIERS: Record<CarrierId, { label: string; trackingBase: string; minWeight: number; maxWeight: number; description: string }> = {
  'colissimo':              { label: 'Colissimo France',           trackingBase: 'https://www.laposte.fr/outils/suivre-vos-envois?code=', minWeight: 0,     maxWeight: 30000, description: 'Livraison 48h en France' },
  'colissimo-international':{ label: 'Colissimo International',     trackingBase: 'https://www.laposte.fr/outils/suivre-vos-envois?code=', minWeight: 0,     maxWeight: 30000, description: 'Livraison Europe / Monde 4-8 jours' },
  'mondial-relay':          { label: 'Mondial Relay',               trackingBase: 'https://www.mondialrelay.fr/suivi-de-colis?codeMarque=&numeroExpedition=', minWeight: 0, maxWeight: 30000, description: 'Point relais — moins cher' },
  'chronopost':             { label: 'Chronopost (express)',        trackingBase: 'https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=', minWeight: 0, maxWeight: 30000, description: 'Express 24h' },
  'pickup':                 { label: 'Retrait sur place (gratuit)', trackingBase: '',                                                                       minWeight: 0, maxWeight: 99999, description: 'Sans frais — à venir chercher' }
};

/**
 * Grilles tarifaires Colissimo France (centimes TTC, livraison à domicile sans signature).
 * Source : tarifs publics La Poste 2026.
 */
const COLISSIMO_FR_TIERS: { maxGrams: number; cents: number }[] = [
  { maxGrams: 250,    cents: 525  },
  { maxGrams: 500,    cents: 770  },
  { maxGrams: 750,    cents: 870  },
  { maxGrams: 1000,   cents: 920  },
  { maxGrams: 2000,   cents: 1095 },
  { maxGrams: 5000,   cents: 1450 },
  { maxGrams: 10000,  cents: 1985 },
  { maxGrams: 15000,  cents: 2415 },
  { maxGrams: 30000,  cents: 3035 }
];

const COLISSIMO_INTL_EU_TIERS: { maxGrams: number; cents: number }[] = [
  { maxGrams: 500,   cents: 1490 },
  { maxGrams: 1000,  cents: 1990 },
  { maxGrams: 2000,  cents: 2790 },
  { maxGrams: 5000,  cents: 4090 },
  { maxGrams: 10000, cents: 5790 },
  { maxGrams: 30000, cents: 8990 }
];

const MONDIAL_RELAY_TIERS: { maxGrams: number; cents: number }[] = [
  { maxGrams: 500,   cents: 395 },
  { maxGrams: 2000,  cents: 495 },
  { maxGrams: 5000,  cents: 595 },
  { maxGrams: 10000, cents: 795 },
  { maxGrams: 20000, cents: 1195 },
  { maxGrams: 30000, cents: 1795 }
];

const CHRONOPOST_TIERS: { maxGrams: number; cents: number }[] = [
  { maxGrams: 1000,  cents: 1690 },
  { maxGrams: 2000,  cents: 1990 },
  { maxGrams: 5000,  cents: 2890 },
  { maxGrams: 10000, cents: 3990 },
  { maxGrams: 30000, cents: 5990 }
];

export function calculateShippingCost(carrier: CarrierId, weightGrams: number, country: string = 'FR'): number {
  if (carrier === 'pickup') return 0;
  let tiers: { maxGrams: number; cents: number }[];
  if (carrier === 'colissimo' && country === 'FR') tiers = COLISSIMO_FR_TIERS;
  else if (carrier === 'colissimo-international' || (carrier === 'colissimo' && country !== 'FR')) tiers = COLISSIMO_INTL_EU_TIERS;
  else if (carrier === 'mondial-relay') tiers = MONDIAL_RELAY_TIERS;
  else if (carrier === 'chronopost') tiers = CHRONOPOST_TIERS;
  else return 0;
  const tier = tiers.find((t) => weightGrams <= t.maxGrams);
  return tier?.cents ?? tiers[tiers.length - 1].cents;
}

export function buildTrackingUrl(carrier: CarrierId, trackingNumber: string): string {
  const base = CARRIERS[carrier]?.trackingBase || '';
  return base ? `${base}${encodeURIComponent(trackingNumber)}` : '';
}

/**
 * Estime le poids d'un produit selon sa catégorie (pour pré-remplir).
 * L'admin peut toujours surcharger.
 */
export function estimateWeight(category: string | null, quantity: number = 1): number {
  const c = (category || '').toLowerCase();
  if (c.includes('vêtement') || c.includes('vetement') || /t-?shirt|sweat/i.test(c)) return 220 * quantity;
  if (c.includes('bougie') || c.includes('candle')) return 350 * quantity;
  if (c.includes('mug')) return 400 * quantity;
  if (c.includes('sac') || c.includes('tote')) return 180 * quantity;
  if (c.includes('affiche') || c.includes('poster')) return 50 * quantity;
  if (c.includes('livre') || c.includes('book')) return 500 * quantity;
  return 250 * quantity; // fallback
}
