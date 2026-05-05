import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const sessions = await prisma.session.findMany({
    where: { userId: (s.user as any).id },
    orderBy: { expires: 'desc' }
  }).catch(() => []);
  return NextResponse.json({ sessions });
}

export async function DELETE(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
  await prisma.session.deleteMany({ where: { id, userId: (s.user as any).id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
