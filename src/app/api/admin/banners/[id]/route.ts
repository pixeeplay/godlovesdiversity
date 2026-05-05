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
  for (const k of ['eyebrow','title','subtitle','mediaUrl','mediaType','cta1Text','cta1Url','cta2Text','cta2Url','accentColor','order','published','aiPrompt','presetSlug','linkedThemeSlug']) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.activeFrom !== undefined)  data.activeFrom  = body.activeFrom  ? new Date(body.activeFrom)  : null;
  if (body.activeUntil !== undefined) data.activeUntil = body.activeUntil ? new Date(body.activeUntil) : null;
  const banner = await prisma.banner.update({ where: { id }, data });
  return NextResponse.json({ ok: true, banner });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  await prisma.banner.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
