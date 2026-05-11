import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { dropshipCreateOrder, type DropProvider } from '@/lib/dropshipping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/orders/[id]/dropship
 * body: { provider: 'aliexpress' | 'spocket' | 'printful' }
 *
 * Forward la commande au fournisseur dropship. Marque l'order avec
 * dropshipProvider, dropshipOrderId, dropshipStatus.
 *
 * On lit les items depuis order.items (Json snapshot). Chaque item peut
 * porter un { dropExternalId, designUrl } ; sinon on tombe sur productId.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const orgId = auth.membership.org.id;
  const body = await req.json().catch(() => ({} as any));
  const provider = body.provider as DropProvider | undefined;
  if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });

  const db = await getTenantPrisma(slug);
  const order = await db.order.findUnique({ where: { id } }).catch(() => null);
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!order.shipAddress) return NextResponse.json({ error: 'Adresse de livraison manquante' }, { status: 400 });

  const items: any[] = Array.isArray(order.items) ? order.items as any : [];
  if (items.length === 0) return NextResponse.json({ error: 'Aucun article dans la commande' }, { status: 400 });

  const dropOrder = {
    orderRef: `${order.id.slice(0, 8)}-${provider}`,
    items: items.map((it) => ({
      productExternalId: it.dropExternalId || it.productId,
      quantity: it.qty || it.quantity || 1,
      designUrl: it.designUrl || undefined,
    })),
    shipTo: {
      name: `${order.firstName || ''} ${order.lastName || ''}`.trim() || order.email,
      email: order.email,
      phone: order.phone || undefined,
      address: order.shipAddress,
      city: order.shipCity || '',
      zip: order.shipPostal || '',
      country: order.shipCountry || 'FR',
    },
  };

  try {
    const result = await dropshipCreateOrder(provider, orgId, dropOrder);
    const updated = await db.order.update({
      where: { id },
      data: {
        dropshipProvider: provider,
        dropshipOrderId: result.id || null,
        dropshipStatus: result.status || 'submitted',
        trackingNumber: result.trackingNumber || order.trackingNumber,
        notes: `${order.notes || ''}\n[Dropship/${provider}] ${new Date().toISOString()} ${JSON.stringify(result)}`.trim(),
      },
    });
    return NextResponse.json({ ok: true, result, order: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'dropship failed' }, { status: 500 });
  }
}
