import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await db.newsletter.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }).catch(() => []);
  return NextResponse.json({ items: items.map((n: any) => ({ ...n, title: n.subject })) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  const newsletter = await db.newsletter.create({
    data: { subject: b.subject || b.title || 'Untitled', bodyHtml: b.bodyHtml || null, status: 'draft' },
  });
  return NextResponse.json({ ok: true, item: newsletter });
}
