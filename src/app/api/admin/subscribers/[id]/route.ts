import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const sub = await prisma.newsletterSubscriber.update({
    where: { id },
    data: {
      status: body.status,
      locale: body.locale,
      confirmedAt: body.status === 'ACTIVE' ? new Date() : undefined
    }
  });
  return NextResponse.json({ ok: true, subscriber: sub });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  await prisma.newsletterSubscriber.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
