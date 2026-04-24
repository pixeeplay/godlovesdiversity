import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: any = {};
  for (const k of ['videoId','title','description','order','published']) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  const video = await prisma.youtubeVideo.update({ where: { id }, data });
  return NextResponse.json({ ok: true, video });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  await prisma.youtubeVideo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
