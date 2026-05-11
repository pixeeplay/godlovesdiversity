import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'pending';
  const type = url.searchParams.get('type') || '';
  const where: any = { status };
  if (type) where.type = type;
  const db = await getTenantPrisma(slug);
  const items = await (db as any).moderationItem?.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.type || !b.content) return NextResponse.json({ error: 'type & content required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const item = await (db as any).moderationItem.create({
    data: {
      type: b.type,
      targetId: b.targetId || null,
      content: b.content,
      authorName: b.authorName || null,
      authorEmail: b.authorEmail || null,
      status: b.status || 'pending',
      aiScore: b.aiScore ?? null,
      aiLabels: b.aiLabels || null,
    },
  });
  return NextResponse.json({ ok: true, item });
}
