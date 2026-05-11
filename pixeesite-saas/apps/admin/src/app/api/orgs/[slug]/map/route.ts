import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || '';
  const country = url.searchParams.get('country') || '';
  const search = (url.searchParams.get('search') || '').trim();
  const where: any = {};
  if (type) where.type = type;
  if (country) where.country = country;
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { city: { contains: search, mode: 'insensitive' } },
    { address: { contains: search, mode: 'insensitive' } },
  ];
  const db = await getTenantPrisma(slug);
  const items = await (db as any).mapLocation?.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.name || b.lat == null || b.lng == null) return NextResponse.json({ error: 'name, lat, lng required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const item = await (db as any).mapLocation.create({
    data: {
      name: b.name,
      type: b.type || null,
      address: b.address || null,
      lat: Number(b.lat),
      lng: Number(b.lng),
      country: b.country || null,
      city: b.city || null,
      description: b.description || null,
      featured: !!b.featured,
      openingHours: b.openingHours || null,
      contact: b.contact || null,
      images: Array.isArray(b.images) ? b.images : [],
    },
  });
  return NextResponse.json({ ok: true, item });
}
