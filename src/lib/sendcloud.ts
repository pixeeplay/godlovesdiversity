/**
 * Client Sendcloud API REST.
 * Sendcloud (https://www.sendcloud.com) est un agrégateur français multi-transporteurs.
 * Une seule API → Colissimo, Mondial Relay, Chronopost, DPD, UPS, Colis Privé, etc.
 *
 * Pourquoi Sendcloud plutôt que les APIs natives ?
 * - Colissimo Web Services natif → contrat pro (~20€/mois) + WSDL SOAP complexe
 * - Mondial Relay WSI → contrat enseigne + intégration spécifique
 * - Chronopost → contrat groupe La Poste
 * - Sendcloud → 1 compte gratuit (100 colis/mois), 1 API REST simple, 1 facturation unifiée
 *
 * Settings requis (table Setting) :
 * - integrations.sendcloud.publicKey
 * - integrations.sendcloud.secretKey
 * - integrations.sendcloud.senderAddressId  (ID de l'adresse expéditeur dans Sendcloud)
 *
 * Endpoint Sendcloud : https://panel.sendcloud.sc/api/v2/
 */

import { getSettings } from './settings';

const API_BASE = 'https://panel.sendcloud.sc/api/v2';

type SendcloudCreds = {
  publicKey: string;
  secretKey: string;
  senderAddressId?: string;
};

async function getCreds(): Promise<SendcloudCreds | null> {
  const s = await getSettings([
    'integrations.sendcloud.publicKey',
    'integrations.sendcloud.secretKey',
    'integrations.sendcloud.senderAddressId'
  ]).catch(() => ({} as Record<string, string>));
  const publicKey = s['integrations.sendcloud.publicKey'] || process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = s['integrations.sendcloud.secretKey'] || process.env.SENDCLOUD_SECRET_KEY;
  if (!publicKey || !secretKey) return null;
  return {
    publicKey, secretKey,
    senderAddressId: s['integrations.sendcloud.senderAddressId'] || process.env.SENDCLOUD_SENDER_ADDRESS_ID
  };
}

function authHeader(c: SendcloudCreds): string {
  return 'Basic ' + Buffer.from(`${c.publicKey}:${c.secretKey}`).toString('base64');
}

/** Liste les méthodes d'expédition disponibles depuis FR vers un pays cible */
export async function listShippingMethods(toCountry: string = 'FR') {
  const creds = await getCreds();
  if (!creds) throw new Error('Sendcloud non configuré (settings integrations.sendcloud.*)');
  const r = await fetch(`${API_BASE}/shipping_methods?to_country=${toCountry}`, {
    headers: { Authorization: authHeader(creds) }
  });
  const j = await r.json();
  return j.shipping_methods || [];
}

/** Crée une expédition (= une étiquette + un tracking number officiel) */
export async function createShipment(opts: {
  orderNumber: string;
  weightGrams: number;
  to: {
    name: string; email: string; phone?: string;
    address: string; address2?: string; city: string; zip: string;
    country: string; // ISO2 ex: 'FR'
  };
  shippingMethodId?: number;  // ID Sendcloud d'une méthode (Colissimo Domicile = 8 par ex.)
  carrier?: 'colissimo' | 'mondial_relay' | 'chronopost' | 'dpd' | 'ups';
}) {
  const creds = await getCreds();
  if (!creds) throw new Error('Sendcloud non configuré');

  // Si pas de method_id explicite, on prend Colissimo France par défaut
  let methodId = opts.shippingMethodId;
  if (!methodId) {
    const methods = await listShippingMethods(opts.to.country);
    const lookup: Record<string, RegExp> = {
      colissimo: /colissimo/i,
      mondial_relay: /mondial.?relay/i,
      chronopost: /chronopost/i,
      dpd: /dpd/i,
      ups: /^ups\b/i
    };
    const want = opts.carrier || 'colissimo';
    const match = methods.find((m: any) => lookup[want].test(m.name) && (m.min_weight * 1000) <= opts.weightGrams && (m.max_weight * 1000) >= opts.weightGrams);
    methodId = match?.id;
    if (!methodId) throw new Error(`Aucune méthode ${want} ne couvre ${opts.weightGrams}g vers ${opts.to.country}`);
  }

  const body = {
    parcel: {
      name: opts.to.name,
      company_name: '',
      address: opts.to.address,
      address_2: opts.to.address2 || '',
      house_number: '', // Sendcloud demande mais accepte vide si address contient le n°
      city: opts.to.city,
      postal_code: opts.to.zip,
      country: opts.to.country,
      email: opts.to.email,
      telephone: opts.to.phone || '',
      weight: (opts.weightGrams / 1000).toFixed(3),
      order_number: opts.orderNumber,
      request_label: true,
      shipment: { id: methodId },
      ...(creds.senderAddressId ? { sender_address: Number(creds.senderAddressId) } : {})
    }
  };

  const r = await fetch(`${API_BASE}/parcels`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(creds),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok || j.error) {
    throw new Error(j.error?.message || `Sendcloud HTTP ${r.status}`);
  }
  const parcel = j.parcel;
  return {
    parcelId: parcel.id as number,
    trackingNumber: parcel.tracking_number as string,
    trackingUrl: parcel.tracking_url as string,
    labelPdfUrl: parcel.label?.label_printer || parcel.label?.normal_printer || null,
    carrier: parcel.carrier?.code,
    raw: parcel
  };
}

/** Récupère le statut actuel d'un colis Sendcloud */
export async function getParcelStatus(parcelId: number) {
  const creds = await getCreds();
  if (!creds) throw new Error('Sendcloud non configuré');
  const r = await fetch(`${API_BASE}/parcels/${parcelId}`, {
    headers: { Authorization: authHeader(creds) }
  });
  const j = await r.json();
  return j.parcel;
}

/** Télécharge le PDF de l'étiquette en buffer */
export async function downloadLabel(labelUrl: string): Promise<Buffer> {
  const creds = await getCreds();
  if (!creds) throw new Error('Sendcloud non configuré');
  const r = await fetch(labelUrl, { headers: { Authorization: authHeader(creds) } });
  if (!r.ok) throw new Error(`Label download failed: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
