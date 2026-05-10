import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) return null;
  return s;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const accounts = await (prisma as any).mailAccount.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true, label: true, email: true, isDefault: true, active: true,
      imapHost: true, imapPort: true, imapSecure: true, imapUser: true,
      smtpHost: true, smtpPort: true, smtpSecure: true, smtpUser: true,
      signature: true, lastSyncAt: true, createdAt: true
    }
  }).catch(() => []);
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  if (!body.email || !body.imapHost || !body.imapUser || !body.imapPassword || !body.smtpHost || !body.smtpUser || !body.smtpPassword) {
    return NextResponse.json({ error: 'missing-fields' }, { status: 400 });
  }

  // Si isDefault, on enleve isDefault des autres
  if (body.isDefault) {
    await (prisma as any).mailAccount.updateMany({ data: { isDefault: false } });
  }

  const acc = await (prisma as any).mailAccount.create({
    data: {
      label: body.label || body.email,
      email: body.email,
      imapHost: body.imapHost,
      imapPort: body.imapPort || 993,
      imapSecure: body.imapSecure !== false,
      imapUser: body.imapUser,
      imapPassword: body.imapPassword,
      smtpHost: body.smtpHost,
      smtpPort: body.smtpPort || 465,
      smtpSecure: body.smtpSecure !== false,
      smtpUser: body.smtpUser,
      smtpPassword: body.smtpPassword,
      signature: body.signature || null,
      isDefault: !!body.isDefault,
      active: body.active !== false
    }
  });
  return NextResponse.json({ ok: true, id: acc.id });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id-required' }, { status: 400 });
  await (prisma as any).mailAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
