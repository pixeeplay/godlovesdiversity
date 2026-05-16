import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KEY = 'shop.settings';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const row = await (db as any).setting?.findUnique?.({ where: { key: KEY } }).catch(() => null);
  let settings: any = null;
  if (row?.value) {
    try { settings = JSON.parse(row.value); } catch { settings = null; }
  }
  return NextResponse.json({ settings: settings || {} });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json().catch(() => ({}));
  const settings = b.settings || {};
  const db = await getTenantPrisma(slug);
  await (db as any).setting?.upsert?.({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) },
  }).catch(() => null);
  return NextResponse.json({ ok: true });
}
