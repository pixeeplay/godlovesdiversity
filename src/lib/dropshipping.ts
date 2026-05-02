/**
 * Client unifié dropshipping print-on-demand pour 3 fournisseurs européens :
 *
 * 1. GELATO (Norvège) - https://gelato.com
 *    - 130+ centres de production dans 32 pays (le + rapide en EU)
 *    - REST API : https://api.gelatoapis.com
 *    - Qualité top, carbon-neutral
 *    - Settings : integrations.gelato.apiKey
 *
 * 2. TPOP (France) - https://www.tpop.com
 *    - 100% éthique, bio, vegan, packaging recyclé (alignement GLD parfait)
 *    - GraphQL : https://api.tpop.com/graphql
 *    - Production France/Pays-Bas
 *    - Settings : integrations.tpop.apiKey
 *
 * 3. PRINTFUL (US, EU warehouses Riga/Madrid) - https://printful.com
 *    - Le + utilisé au monde, catalogue énorme (250+ produits)
 *    - REST API : https://api.printful.com
 *    - Settings : integrations.printful.apiKey + integrations.printful.storeId
 */

import { getSettings } from './settings';

export type DropProvider = 'gelato' | 'tpop' | 'printful';

export type DropOrderItem = {
  productExternalId: string;     // ID variant chez le fournisseur
  quantity: number;
  designUrl: string;             // URL publique du visuel à imprimer
};

export type DropOrder = {
  orderRef: string;              // Notre ID de commande
  items: DropOrderItem[];
  shipTo: {
    name: string; email: string; phone?: string;
    address: string; address2?: string; city: string; zip: string; country: string;
  };
};

/* ─── GELATO ──────────────────────────────────────────────────────── */

export async function gelatoListProducts() {
  const s = await getSettings(['integrations.gelato.apiKey']);
  const key = s['integrations.gelato.apiKey'] || process.env.GELATO_API_KEY;
  if (!key) throw new Error('Gelato non configuré');
  // L'endpoint catalogue Gelato : product-catalogues
  const r = await fetch('https://product-catalogues.gelatoapis.com/v3/catalogs', {
    headers: { 'X-API-KEY': key }
  });
  return r.json();
}

export async function gelatoCreateOrder(order: DropOrder) {
  const s = await getSettings(['integrations.gelato.apiKey']);
  const key = s['integrations.gelato.apiKey'] || process.env.GELATO_API_KEY;
  if (!key) throw new Error('Gelato non configuré');

  const body = {
    orderType: 'order',
    orderReferenceId: order.orderRef,
    customerReferenceId: order.shipTo.email,
    currency: 'EUR',
    items: order.items.map((it, i) => ({
      itemReferenceId: `${order.orderRef}-${i}`,
      productUid: it.productExternalId,
      files: [{ type: 'default', url: it.designUrl }],
      quantity: it.quantity
    })),
    shippingAddress: {
      firstName: order.shipTo.name.split(' ')[0],
      lastName: order.shipTo.name.split(' ').slice(1).join(' ') || '-',
      addressLine1: order.shipTo.address,
      addressLine2: order.shipTo.address2 || '',
      city: order.shipTo.city,
      postCode: order.shipTo.zip,
      country: order.shipTo.country.toUpperCase(),
      email: order.shipTo.email,
      phone: order.shipTo.phone || ''
    }
  };
  const r = await fetch('https://order.gelatoapis.com/v4/orders', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || `Gelato HTTP ${r.status}`);
  return { id: j.id, trackingNumber: j.shipment?.trackingCode, status: j.fulfillmentStatus };
}

/* ─── TPOP ────────────────────────────────────────────────────────── */

export async function tpopGraphql(query: string, variables: any = {}) {
  const s = await getSettings(['integrations.tpop.apiKey']);
  const key = s['integrations.tpop.apiKey'] || process.env.TPOP_API_KEY;
  if (!key) throw new Error('TPOP non configuré');
  const r = await fetch('https://api.tpop.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  return r.json();
}

export async function tpopCreateOrder(order: DropOrder) {
  const mutation = `
    mutation CreateOrder($input: OrderInput!) {
      createOrder(input: $input) { id status trackingNumber }
    }`;
  const r = await tpopGraphql(mutation, {
    input: {
      reference: order.orderRef,
      shippingAddress: {
        fullName: order.shipTo.name, email: order.shipTo.email, phone: order.shipTo.phone || '',
        address1: order.shipTo.address, address2: order.shipTo.address2 || '',
        city: order.shipTo.city, postalCode: order.shipTo.zip, country: order.shipTo.country.toUpperCase()
      },
      items: order.items.map((it) => ({
        variantId: it.productExternalId,
        quantity: it.quantity,
        printFiles: [{ url: it.designUrl }]
      }))
    }
  });
  if (r.errors) throw new Error(r.errors[0].message);
  return r.data.createOrder;
}

/* ─── PRINTFUL ────────────────────────────────────────────────────── */

export async function printfulCreateOrder(order: DropOrder) {
  const s = await getSettings(['integrations.printful.apiKey', 'integrations.printful.storeId']);
  const key = s['integrations.printful.apiKey'] || process.env.PRINTFUL_API_KEY;
  const storeId = s['integrations.printful.storeId'] || process.env.PRINTFUL_STORE_ID;
  if (!key) throw new Error('Printful non configuré');

  const body = {
    external_id: order.orderRef,
    recipient: {
      name: order.shipTo.name, email: order.shipTo.email, phone: order.shipTo.phone,
      address1: order.shipTo.address, address2: order.shipTo.address2 || '',
      city: order.shipTo.city, zip: order.shipTo.zip, country_code: order.shipTo.country.toUpperCase()
    },
    items: order.items.map((it) => ({
      sync_variant_id: Number(it.productExternalId),
      quantity: it.quantity,
      files: [{ url: it.designUrl }]
    }))
  };
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  if (storeId) headers['X-PF-Store-Id'] = storeId;
  const r = await fetch('https://api.printful.com/orders', {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error?.message || `Printful HTTP ${r.status}`);
  return { id: j.result.id, status: j.result.status };
}

/* ─── DISPATCHER UNIVERSEL ────────────────────────────────────────── */

export async function dropshipCreateOrder(provider: DropProvider, order: DropOrder) {
  switch (provider) {
    case 'gelato':   return gelatoCreateOrder(order);
    case 'tpop':     return tpopCreateOrder(order);
    case 'printful': return printfulCreateOrder(order);
    default:         throw new Error(`Provider inconnu: ${provider}`);
  }
}

/** Calcule la marge en pourcentage et en euros */
export function calculateMargin(salePriceCents: number, costCents: number) {
  if (!costCents || costCents === 0) return { profitCents: salePriceCents, percent: 100 };
  const profitCents = salePriceCents - costCents;
  const percent = Math.round((profitCents / salePriceCents) * 100);
  return { profitCents, percent };
}
