import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { buildTrackingUrl } from '@/lib/dropshipping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const db = await getTenantPrisma(slug);
  const order = await db.order.findUnique({ where: { id } }).catch(() => null);
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(order);
}

/**
 * PATCH update order :
 *  - status (pending|paid|shipped|delivered|refunded|cancelled)
 *  - carrier, trackingNumber, trackingUrl
 *  - notes
 *  - shipping fields (firstName, lastName, shipAddress, …)
 *
 * Effets de bord :
 *  - status → shipped : on stampe shippedAt si absent et on construit trackingUrl
 *    si carrier+trackingNumber sont fournis.
 *  - status → delivered : on stampe deliveredAt si absent.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const db = await getTenantPrisma(slug);
  const before = await db.order.findUnique({ where: { id } }).catch(() => null);
  if (!before) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const data = await req.json();
  const update: any = {};
  const allow = [
    'status', 'carrier', 'trackingNumber', 'trackingUrl', 'notes',
    'firstName', 'lastName', 'phone',
    'shipAddress', 'shipCity', 'shipPostal', 'shipCountry',
  ];
  for (const k of allow) if (k in data) update[k] = data[k];

  // Auto trackingUrl si carrier+number fournis et pas d'URL explicite
  if (update.carrier && update.trackingNumber && !update.trackingUrl) {
    update.trackingUrl = buildTrackingUrl(update.carrier, update.trackingNumber) || undefined;
  }
  // Stamps
  if (update.status === 'shipped'   && !before.shippedAt)   update.shippedAt   = new Date();
  if (update.status === 'delivered' && !before.deliveredAt) update.deliveredAt = new Date();

  const updated = await db.order.update({ where: { id }, data: update });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await db.order.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
