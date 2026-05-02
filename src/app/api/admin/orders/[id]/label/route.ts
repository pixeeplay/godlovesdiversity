import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CARRIERS } from '@/lib/shipping';

/**
 * Génère une étiquette d'expédition à imprimer (HTML imprimable, A6 paysage).
 * Pour des étiquettes officielles avec code-barres prépayé Colissimo, brancher
 * l'API SOAP Colissimo (compte pro requis). Ici : étiquette d'adresse à coller
 * sur le colis + dépôt en bureau de poste.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return new Response('Unauthorized', { status: 401 });
  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } }
  });
  if (!order) return new Response('Not found', { status: 404 });

  const carrier = order.carrier ? CARRIERS[order.carrier as keyof typeof CARRIERS] : null;
  const SENDER = {
    name: 'God Loves Diversity',
    address: 'Boutique GLD',
    line2: 'À retirer en bureau de poste',
    zip: '75001',
    city: 'Paris',
    country: 'France'
  };

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Étiquette ${order.id.slice(0, 8)}</title>
<style>
  @page { size: A6 landscape; margin: 8mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; }
  .label { border: 2px solid #000; padding: 12px; }
  .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .from { font-size: 10px; color: #555; max-width: 180px; }
  .to { font-size: 13px; line-height: 1.4; }
  .to strong { font-size: 16px; display: block; margin-bottom: 4px; }
  .barcode { font-family: 'Libre Barcode 39', monospace; font-size: 36px; text-align: center; margin: 12px 0; letter-spacing: 2px; }
  .ref { font-family: monospace; font-size: 14px; text-align: center; }
  .meta { display: flex; justify-content: space-between; font-size: 10px; color: #555; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc; }
  .stamp { border: 1px solid #000; padding: 4px 10px; display: inline-block; font-weight: bold; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
<div class="no-print" style="padding:10px;background:#FFE4F0;text-align:center">
  <button onclick="window.print()" style="background:#FF2BB1;color:white;border:none;padding:8px 20px;border-radius:20px;font-weight:bold;cursor:pointer">🖨 Imprimer cette étiquette</button>
  <a href="/admin/shop/orders/${order.id}" style="margin-left:10px;color:#555">← Retour</a>
</div>
<div class="label">
  <div class="row">
    <div class="from">
      <strong>EXPÉDITEUR</strong><br>
      ${SENDER.name}<br>
      ${SENDER.address}<br>
      ${SENDER.zip} ${SENDER.city}<br>
      ${SENDER.country}
    </div>
    <div class="stamp">${carrier?.label || 'COLISSIMO'}</div>
  </div>
  <div class="to">
    <strong>${order.name || order.email}</strong>
    ${order.shippingAddress ? order.shippingAddress.replace(/\n/g, '<br>') : ''}<br>
    ${order.shippingZip || ''} ${order.shippingCity || ''}<br>
    ${order.shippingCountry || 'France'}
  </div>
  <div class="ref">N° commande : <strong>${order.id.slice(0, 8).toUpperCase()}</strong></div>
  ${order.trackingNumber ? `<div class="barcode">*${order.trackingNumber}*</div><div class="ref">${order.trackingNumber}</div>` : ''}
  <div class="meta">
    <span>Poids : ${order.weightGrams ? (order.weightGrams / 1000).toFixed(2) + ' kg' : '—'}</span>
    <span>Articles : ${order.items.length}</span>
    <span>${new Date().toLocaleDateString('fr-FR')}</span>
  </div>
</div>
<script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
