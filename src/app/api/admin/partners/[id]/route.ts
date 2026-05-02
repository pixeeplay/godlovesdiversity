import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const data = await req.json();
  const updated = await prisma.partner.update({
    where: { id },
    data: {
      name: data.name,
      url: data.url,
      logoUrl: data.logoUrl ?? null,
      description: data.description ?? null,
      category: data.category ?? null,
      order: typeof data.order === 'number' ? data.order : undefined,
      published: typeof data.published === 'boolean' ? data.published : undefined
    }
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  await prisma.partner.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
