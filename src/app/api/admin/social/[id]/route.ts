import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const post = await prisma.scheduledPost.update({
    where: { id },
    data: {
      title: body.title,
      content: body.content,
      mediaKeys: body.mediaKeys,
      channels: body.channels,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      status: body.status
    }
  });
  return NextResponse.json({ ok: true, post });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  await prisma.scheduledPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
