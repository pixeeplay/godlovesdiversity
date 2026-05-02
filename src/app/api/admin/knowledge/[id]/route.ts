import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const data = await req.json();
  const updated = await prisma.knowledgeDoc.update({
    where: { id },
    data: {
      title: data.title,
      author: data.author ?? null,
      tags: Array.isArray(data.tags) ? data.tags : undefined,
      enabled: typeof data.enabled === 'boolean' ? data.enabled : undefined,
      locale: data.locale
    }
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  await prisma.knowledgeDoc.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
