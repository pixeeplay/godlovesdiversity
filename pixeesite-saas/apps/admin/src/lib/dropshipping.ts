/**
 * Client unifié dropshipping multi-tenant pour 3 fournisseurs :
 *
 * 1. ALIEXPRESS — l'API officielle (Open Platform) demande un app key + signature HMAC.
 *    Stub minimal ici : POST forward order avec auth header.
 *    Settings : OrgSecret `ALIEXPRESS_KEY`.
 *
 * 2. SPOCKET — REST API privée. Endpoint /orders.
 *    Settings : OrgSecret `SPOCKET_KEY`.
 *
 * 3. PRINTFUL — REST API publique très bien documentée.
 *    Settings : OrgSecret `PRINTFUL_KEY` (+ optionnel `PRINTFUL_STORE_ID`).
 *
 * Toutes les clés sont résolues via getOrgSecret(orgId, KEY) avec fallback
 * sur la secret plateforme si l'org ne l'a pas explicitement configurée.
 */

import { getOrgSecret } from './secrets';

export type DropProvider = 'aliexpress' | 'spocket' | 'printful';

export type DropOrderItem = {
  productExternalId: string;     // ID variant chez le fournisseur
  quantity: number;
  designUrl?: string;            // URL publique du visuel (POD)
};

export type DropShipTo = {
  name: string;
  email: string;
  phone?: string;
  address: string;
  address2?: string;
  city: string;
  zip: string;
  country: string; // ISO-2 (FR, US…)
};

export type DropOrder = {
  orderRef: string;              // Notre ID de commande
  items: DropOrderItem[];
  shipTo: DropShipTo;
};

export type DropResult = {
  id?: string;
  trackingNumber?: string;
  status?: string;
  raw?: any;
};

/* ─── ALIEXPRESS ──────────────────────────────────────────────────── */
/**
 * TODO : implémenter la vraie API AliExpress Open Platform (signature HMAC).
 * Pour l'instant, stub minimal qui POST sur un endpoint configurable.
 */
export async function aliexpressCreateOrder(orgId: string, order: DropOrder): Promise<DropResult> {
  const key = await getOrgSecret(orgId, 'ALIEXPRESS_KEY');
  if (!key) throw new Error('AliExpress non configuré (ALIEXPRESS_KEY manquante)');
  // Stub : on log et renvoie un id dérivé du orderRef.
  // À remplacer par : signature HMAC + POST sur https://api.aliexpress.com/sync
  console.warn('[aliexpress] stub createOrder — implementer Open Platform API', { orderRef: order.orderRef });
  return {
    id: `ALI-${order.orderRef}`,
    status: 'pending',
    raw: { stub: true, note: 'AliExpress Open Platform integration TODO' },
  };
}

export async function aliexpressTest(orgId: string): Promise<{ ok: boolean; message: string }> {
  const key = await getOrgSecret(orgId, 'ALIEXPRESS_KEY');
  if (!key) return { ok: false, message: 'Aucune clé ALIEXPRESS_KEY renseignée' };
  if (key.length < 16) return { ok: false, message: `Clé trop courte (${key.length} car.) — vérifie qu'elle est complète` };
  return { ok: true, message: `Clé AliExpress présente (${key.length} car.) — stub OK. L'appel API réel sera ajouté avec la signature HMAC.` };
}

/* ─── SPOCKET ─────────────────────────────────────────────────────── */
/**
 * Spocket REST API (privée, nécessite la clé partenaire).
 * Doc : https://docs.spocket.co/
 */
export async function spocketCreateOrder(orgId: string, order: DropOrder): Promise<DropResult> {
  const key = await getOrgSecret(orgId, 'SPOCKET_KEY');
  if (!key) throw new Error('Spocket non configuré (SPOCKET_KEY manquante)');

  const body = {
    reference_id: order.orderRef,
    customer: {
      email: order.shipTo.email,
      first_name: order.shipTo.name.split(' ')[0],
      last_name: order.shipTo.name.split(' ').slice(1).join(' ') || '-',
      phone: order.shipTo.phone,
    },
    shipping_address: {
      address1: order.shipTo.address,
      address2: order.shipTo.address2 || '',
      city: order.shipTo.city,
      zip: order.shipTo.zip,
      country_code: order.shipTo.country.toUpperCase(),
    },
    line_items: order.items.map((it) => ({
      variant_id: it.productExternalId,
      quantity: it.quantity,
    })),
  };
  const r = await fetch('https://app.spocket.co/api/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({} as any));
  if (!r.ok) throw new Error(j?.message || j?.error || `Spocket HTTP ${r.status}`);
  return {
    id: j?.id || j?.data?.id,
    trackingNumber: j?.tracking_number,
    status: j?.status,
    raw: j,
  };
}

export async function spocketTest(orgId: string): Promise<{ ok: boolean; message: string }> {
  const key = await getOrgSecret(orgId, 'SPOCKET_KEY');
  if (!key) return { ok: false, message: 'Aucune clé SPOCKET_KEY renseignée' };
  try {
    const r = await fetch('https://app.spocket.co/api/v1/me', {
      headers: { Authorization: `Bearer ${key.trim()}` },
    });
    if (r.status === 401 || r.status === 403) return { ok: false, message: `Clé Spocket rejetée (HTTP ${r.status})` };
    if (!r.ok) return { ok: false, message: `Spocket HTTP ${r.status}` };
    return { ok: true, message: 'Connexion Spocket OK — clé valide' };
  } catch (e: any) {
    return { ok: false, message: `Erreur réseau Spocket : ${e?.message || 'inconnue'}` };
  }
}

/* ─── PRINTFUL ────────────────────────────────────────────────────── */
/**
 * Printful REST API — doc https://www.printful.com/docs
 */
export async function printfulCreateOrder(orgId: string, order: DropOrder): Promise<DropResult> {
  const key = await getOrgSecret(orgId, 'PRINTFUL_KEY');
  const storeId = await getOrgSecret(orgId, 'PRINTFUL_STORE_ID');
  if (!key) throw new Error('Printful non configuré (PRINTFUL_KEY manquante)');

  const body = {
    external_id: order.orderRef,
    recipient: {
      name: order.shipTo.name,
      email: order.shipTo.email,
      phone: order.shipTo.phone,
      address1: order.shipTo.address,
      address2: order.shipTo.address2 || '',
      city: order.shipTo.city,
      zip: order.shipTo.zip,
      country_code: order.shipTo.country.toUpperCase(),
    },
    items: order.items.map((it) => ({
      sync_variant_id: Number(it.productExternalId) || undefined,
      external_variant_id: !Number(it.productExternalId) ? it.productExternalId : undefined,
      quantity: it.quantity,
      files: it.designUrl ? [{ url: it.designUrl }] : undefined,
    })),
  };
  const headers: Record<string, string> = { Authorization: `Bearer ${key.trim()}`, 'Content-Type': 'application/json' };
  if (storeId) headers['X-PF-Store-Id'] = storeId;

  const r = await fetch('https://api.printful.com/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({} as any));
  if (!r.ok || j?.error) throw new Error(j?.error?.message || `Printful HTTP ${r.status}`);
  return {
    id: String(j?.result?.id || ''),
    status: j?.result?.status,
    raw: j?.result,
  };
}

export async function printfulTest(orgId: string): Promise<{ ok: boolean; message: string; info?: any }> {
  const key = await getOrgSecret(orgId, 'PRINTFUL_KEY');
  const storeId = await getOrgSecret(orgId, 'PRINTFUL_STORE_ID');
  if (!key) return { ok: false, message: 'Aucune clé PRINTFUL_KEY renseignée' };
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${key.trim()}` };
    if (storeId) headers['X-PF-Store-Id'] = storeId;
    const r = await fetch('https://api.printful.com/store', { headers });
    const j = await r.json().catch(() => ({} as any));
    if (r.status === 401 || r.status === 403) return { ok: false, message: `Clé Printful rejetée (HTTP ${r.status})` };
    if (!r.ok) return { ok: false, message: j?.error?.message || `Printful HTTP ${r.status}` };
    return {
      ok: true,
      message: `Connexion Printful OK — boutique « ${j?.result?.name || j?.result?.id || 'sans nom'} »`,
      info: { storeName: j?.result?.name, storeId: j?.result?.id, currency: j?.result?.currency },
    };
  } catch (e: any) {
    return { ok: false, message: `Erreur réseau Printful : ${e?.message || 'inconnue'}` };
  }
}

/* ─── DISPATCHER UNIVERSEL ────────────────────────────────────────── */

export async function dropshipCreateOrder(provider: DropProvider, orgId: string, order: DropOrder): Promise<DropResult> {
  switch (provider) {
    case 'aliexpress': return aliexpressCreateOrder(orgId, order);
    case 'spocket':    return spocketCreateOrder(orgId, order);
    case 'printful':   return printfulCreateOrder(orgId, order);
    default:           throw new Error(`Provider inconnu: ${provider}`);
  }
}

export async function dropshipTest(provider: DropProvider, orgId: string) {
  switch (provider) {
    case 'aliexpress': return aliexpressTest(orgId);
    case 'spocket':    return spocketTest(orgId);
    case 'printful':   return printfulTest(orgId);
    default:           return { ok: false, message: `Provider inconnu: ${provider}` };
  }
}

/** Calcule la marge en pourcentage et en euros. */
export function calculateMargin(salePriceCents: number, costCents: number) {
  if (!costCents || costCents === 0) return { profitCents: salePriceCents, percent: 100 };
  const profitCents = salePriceCents - costCents;
  const percent = salePriceCents > 0 ? Math.round((profitCents / salePriceCents) * 100) : 0;
  return { profitCents, percent };
}

/* ─── TRACKING REFRESH (Boxtal / Shippo stub) ─────────────────────── */
/**
 * TODO : intégration Boxtal et Shippo.
 * Pour l'instant, helper qui dérive l'URL de tracking à partir du carrier.
 */
export function buildTrackingUrl(carrier: string | null | undefined, trackingNumber: string | null | undefined): string | null {
  if (!carrier || !trackingNumber) return null;
  const c = carrier.toLowerCase();
  if (c.includes('laposte') || c === 'colissimo') return `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNumber}`;
  if (c.includes('chronopost')) return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${trackingNumber}`;
  if (c.includes('dhl')) return `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${trackingNumber}`;
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  if (c.includes('mondial')) return `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${trackingNumber}`;
  if (c.includes('boxtal')) return `https://www.boxtal.com/fr/fr/expedition/suivi?numero=${trackingNumber}`;
  if (c.includes('shippo')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  return null;
}
