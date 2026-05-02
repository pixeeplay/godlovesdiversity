import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Endpoint public pour le suivi d'une commande via son token public.
 * Aucune info sensible exposée (pas de paymentId, pas d'IP, pas de notes admin).
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  try {
    const order = await prisma.order.findUnique({
      where: { publicToken: token },
      select: {
        id: true, status: true, totalCents: true, currency: true,
        email: true, name: true, shippingAddress: true,
        carrier: true, trackingNumber: true, trackingUrl: true,
        shippedAt: true, deliveredAt: true, createdAt: true,
        items: {
          select: {
            id: true, quantity: true, priceCents: true, variant: true,
            product: { select: { slug: true, title: true, images: true } }
          }
        }
      }
    });
    if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
    // Masque l'email pour la réponse publique (RGPD)
    const masked = {
      ...order,
      email: order.email.replace(/^(.{2}).*@/, '$1•••@')
    };
    return NextResponse.json(masked);
  } catch {
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}
