import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { requireSuperAdmin } from '@/lib/super-admin';
import { encryptSecret, decryptSecret, maskSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try { await requireSuperAdmin(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const rows = await platformDb.platformSecret.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
  // Return masked values
  const items = rows.map((r) => ({
    id: r.id, key: r.key, category: r.category, description: r.description,
    active: r.active, masked: maskSecret(decryptSecret(r.value)),
    updatedAt: r.updatedAt,
  }));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  let auth;
  try { auth = await requireSuperAdmin(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.key) return NextResponse.json({ error: 'key required' }, { status: 400 });
  const data: any = {
    key: b.key.toUpperCase().trim(),
    category: b.category || 'general',
    description: b.description || null,
    active: b.active !== false,
    updatedBy: (auth.user as any).id || null,
  };
  if (b.value !== undefined) data.value = encryptSecret(String(b.value));
  const row = await platformDb.platformSecret.upsert({
    where: { key: data.key },
    create: { ...data, value: data.value || '' },
    update: data,
  });
  return NextResponse.json({ id: row.id, key: row.key });
}

export async function DELETE(req: NextRequest) {
  try { await requireSuperAdmin(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await platformDb.platformSecret.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
