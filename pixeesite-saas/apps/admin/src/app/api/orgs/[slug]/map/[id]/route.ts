import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  const data: any = {};
  for (const k of ['name', 'type', 'address', 'country', 'city', 'description', 'featured'] as const) if (b[k] !== undefined) data[k] = b[k];
  if (b.lat !== undefined) data.lat = Number(b.lat);
  if (b.lng !== undefined) data.lng = Number(b.lng);
  if (b.openingHours !== undefined) data.openingHours = b.openingHours;
  if (b.contact !== undefined) data.contact = b.contact;
  if (Array.isArray(b.images)) data.images = b.images;
  const item = await (db as any).mapLocation.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await (db as any).mapLocation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
