import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await (db as any).poster?.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const item = await (db as any).poster.create({
    data: {
      name: b.name,
      theme: b.theme || null,
      content: b.content || null,
      imageUrl: b.imageUrl || null,
      sizes: Array.isArray(b.sizes) ? b.sizes : ['A4'],
    },
  });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  await (db as any).poster.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
