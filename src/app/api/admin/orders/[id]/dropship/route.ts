import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dropshipCreateOrder, type DropProvider } from '@/lib/dropshipping';

/**
 * Crée la commande chez le fournisseur dropship pour TOUS les produits dropship
 * de cette commande. Regroupe par fournisseur (1 sub-commande par provider).
 *
 * À appeler manuellement depuis OrderEditor OU automatiquement quand le webhook
 * Stripe/Square confirme le paiement.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } }
  });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!order.shippingAddress) return NextResponse.json({ error: 'Adresse de livraison manquante' }, { status: 400 });

  // Groupe les items par provider
  const byProvider: Record<string, typeof order.items> = {};
  let nonDropshipCount = 0;
  for (const it of order.items) {
    const prov = (it.product as any).dropProvider as DropProvider | null;
    if (!prov || !(it.product as any).dropProductId) {
      nonDropshipCount++;
      continue;
    }
    if (!byProvider[prov]) byProvider[prov] = [] as any;
    byProvider[prov].push(it);
  }

  if (Object.keys(byProvider).length === 0) {
    return NextResponse.json({ error: 'Aucun produit configuré en dropshipping dans cette commande' }, { status: 400 });
  }

  const results: any[] = [];

  for (const [provider, items] of Object.entries(byProvider)) {
    try {
      // Construit l'URL de chaque visuel à imprimer (1ère image du produit ou variant)
      const dropOrder = {
        orderRef: `${order.id.slice(0, 8)}-${provider}`,
        items: items.map((it) => ({
          productExternalId: (it.product as any).dropProductId,
          quantity: it.quantity,
          designUrl: it.product.images?.[0] || ''
        })),
        shipTo: {
          name: order.name || order.email,
          email: order.email,
          phone: order.phone || undefined,
          address: order.shippingAddress!.split('\n')[0] || order.shippingAddress!,
          address2: order.shippingAddress!.split('\n').slice(1).join(' ') || undefined,
          city: order.shippingCity || '',
          zip: order.shippingZip || '',
          country: order.shippingCountry || 'FR'
        }
      };
      const result = await dropshipCreateOrder(provider as DropProvider, dropOrder);
      results.push({ provider, ok: true, ...result });
    } catch (e: any) {
      results.push({ provider, ok: false, error: e.message });
    }
  }

  // Stocke un résumé dans les notes
  await prisma.order.update({
    where: { id },
    data: {
      notes: `${order.notes || ''}\n[Dropship] ${new Date().toISOString()} ${JSON.stringify(results)}`.trim()
    }
  });

  return NextResponse.json({
    ok: results.every((r) => r.ok),
    results,
    nonDropshipCount,
    message: nonDropshipCount > 0 ? `${nonDropshipCount} article(s) à expédier manuellement (pas en dropship)` : undefined
  });
}
