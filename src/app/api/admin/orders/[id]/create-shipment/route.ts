import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createShipment } from '@/lib/sendcloud';

/**
 * Crée une vraie expédition Sendcloud (étiquette officielle + tracking number).
 * Body : { carrier?: 'colissimo'|'mondial_relay'|'chronopost' }
 * Met à jour la commande avec les infos officielles.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const carrier = body.carrier as 'colissimo' | 'mondial_relay' | 'chronopost' | undefined;

  if (!order.shippingAddress || !order.shippingZip || !order.shippingCity) {
    return NextResponse.json({ error: 'Adresse de livraison incomplète' }, { status: 400 });
  }
  if (!order.weightGrams) {
    return NextResponse.json({ error: 'Saisis le poids du colis avant de créer l\'expédition' }, { status: 400 });
  }

  try {
    const result = await createShipment({
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      weightGrams: order.weightGrams,
      to: {
        name: order.name || order.email,
        email: order.email,
        phone: order.phone || undefined,
        address: order.shippingAddress.split('\n')[0] || order.shippingAddress,
        address2: order.shippingAddress.split('\n').slice(1).join(' ') || undefined,
        city: order.shippingCity,
        zip: order.shippingZip,
        country: (order.shippingCountry || 'FR').toUpperCase()
      },
      carrier
    });

    // Met à jour la commande avec les infos OFFICIELLES de Sendcloud
    const updated = await prisma.order.update({
      where: { id },
      data: {
        carrier: result.carrier || carrier || 'colissimo',
        trackingNumber: result.trackingNumber,
        trackingUrl: result.trackingUrl,
        // Stocke aussi le label URL dans paymentId pour le re-télécharger
        notes: `${order.notes || ''}\n[Sendcloud] parcelId=${result.parcelId} label=${result.labelPdfUrl || 'pas dispo'}`.trim()
      }
    });

    return NextResponse.json({
      ok: true,
      trackingNumber: result.trackingNumber,
      trackingUrl: result.trackingUrl,
      labelPdfUrl: result.labelPdfUrl,
      parcelId: result.parcelId,
      order: updated
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
