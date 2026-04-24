import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const poster = await prisma.poster.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      format: body.format,
      size: body.size,
      order: body.order,
      published: body.published
    }
  });
  return NextResponse.json({ ok: true, poster });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  await prisma.poster.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
