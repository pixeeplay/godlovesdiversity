import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** GET /api/admin/tariffs/[id] — détail source + imports récents. */
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const src = await prisma.tariffSource.findUnique({
    where: { id: ctx.params.id },
    include: {
      imports: {
        orderBy: { startedAt: 'desc' },
        take: 20,
      },
    },
  });
  if (!src) return NextResponse.json({ error: 'source introuvable' }, { status: 404 });
  return NextResponse.json({
    source: src,
    imports: src.imports.map((i) => ({
      ...i,
      startedAt: i.startedAt.toISOString(),
      finishedAt: i.finishedAt?.toISOString(),
    })),
  });
}

/** PATCH — mise à jour. */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.name === 'string') data.name = body.name;
  if (typeof body.active === 'boolean') data.active = body.active;
  if (body.mapping) data.mapping = body.mapping;
  if (body.config) data.config = body.config;
  if (typeof body.format === 'string') data.format = body.format;
  if (typeof body.csvDelimiter === 'string') data.csvDelimiter = body.csvDelimiter;
  if (typeof body.vendorDomain === 'string') data.vendorDomain = body.vendorDomain;
  if (typeof body.notes === 'string') data.notes = body.notes;
  await prisma.tariffSource.update({ where: { id: ctx.params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  await prisma.tariffSource.delete({ where: { id: ctx.params.id } });
  return NextResponse.json({ ok: true });
}
