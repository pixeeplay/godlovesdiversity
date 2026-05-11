import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await db.formConfig.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []);
  return NextResponse.json({ items: items.map((f: any) => ({ ...f, title: f.name })) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  const form = await db.formConfig.create({
    data: {
      slug: (b.slug || b.name || 'form').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: b.name || 'Form',
      fields: b.fields || [{ name: 'email', label: 'Email', type: 'email', required: true }],
    },
  });
  return NextResponse.json({ ok: true, item: form });
}
