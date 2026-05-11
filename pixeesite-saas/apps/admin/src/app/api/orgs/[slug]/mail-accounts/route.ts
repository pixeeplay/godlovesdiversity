import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  // Only return safe fields (no passwords)
  const items = await db.mailAccount.findMany({
    select: { id: true, label: true, email: true, imapHost: true, smtpHost: true, isDefault: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  }).catch(() => []);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  const acc = await db.mailAccount.create({
    data: {
      label: b.label || b.email || 'Mail',
      email: b.email,
      imapHost: b.imapHost,
      imapPort: parseInt(b.imapPort || '993', 10),
      imapSecure: b.imapSecure !== false,
      imapUser: b.imapUser || b.email,
      imapPassword: b.imapPassword,
      smtpHost: b.smtpHost,
      smtpPort: parseInt(b.smtpPort || '465', 10),
      smtpSecure: b.smtpSecure !== false,
      smtpUser: b.smtpUser || b.email,
      smtpPassword: b.smtpPassword,
      signature: b.signature || null,
      isDefault: b.isDefault || false,
    },
  });
  return NextResponse.json({ id: acc.id, email: acc.email });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  await db.mailAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
