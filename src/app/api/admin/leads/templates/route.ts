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

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const where: any = {};
  if (type) where.type = type;
  const templates = await (prisma as any).emailTemplate.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 200
  }).catch(() => []);
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const data: any = {
    name: (body.name as string)?.trim() || 'Sans titre',
    type: (body.type as string) || 'b2b-email',
    subject: body.subject || null,
    body: body.body || '',
    variables: Array.isArray(body.variables) ? body.variables : [],
    language: body.language || 'fr',
    category: body.category || null,
    active: body.active !== false
  };
  const template = await (prisma as any).emailTemplate.create({ data });
  return NextResponse.json({ ok: true, template });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: 'id-required' }, { status: 400 });
  const template = await (prisma as any).emailTemplate.update({
    where: { id },
    data: {
      name: body.name,
      type: body.type,
      subject: body.subject,
      body: body.body,
      variables: body.variables,
      language: body.language,
      category: body.category,
      active: body.active
    }
  });
  return NextResponse.json({ ok: true, template });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id-required' }, { status: 400 });
  await (prisma as any).emailTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
