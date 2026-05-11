import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/orders/refresh-tracking
 *
 * Pour chaque commande SHIPPED non encore livrée, ping le carrier
 * (TODO: Boxtal/Shippo API) et marque deliveredAt si le colis est livré.
 *
 * Auth : soit session admin, soit header x-cron-secret = process.env.CRON_SECRET.
 *
 * Implémentation actuelle : stub qui scanne et renvoie la liste ; quand
 * une intégration carrier est dispo, l'appel se fait ici par dispatch sur
 * order.carrier.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Auth : cron secret OU session admin
  const cronSecret = req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;
  const isCron = !!expected && cronSecret === expected;
  if (!isCron) {
    try { await requireOrgMember(slug, ['owner', 'admin']); }
    catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  }

  const db = await getTenantPrisma(slug);
  const orders = await db.order.findMany({
    where: { status: 'shipped', deliveredAt: null, trackingNumber: { not: null } },
    take: 50,
  }).catch(() => []);

  const updates: any[] = [];
  for (const o of orders) {
    // TODO: brancher Boxtal/Shippo selon o.carrier.
    // Stub : pas d'API → on log la tentative et on continue.
    updates.push({ id: o.id, carrier: o.carrier, trackingNumber: o.trackingNumber, status: 'stub-not-checked' });
  }

  return NextResponse.json({ checked: orders.length, updates, note: 'Boxtal/Shippo integration TODO' });
}
