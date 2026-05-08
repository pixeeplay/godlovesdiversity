import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** GET /api/admin/tariffs — liste des TariffSource avec stats. */
export async function GET(_req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sources = await prisma.tariffSource.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { imports: true } },
    },
  });

  return NextResponse.json({
    sources: sources.map((src) => ({
      id: src.id,
      name: src.name,
      type: src.type,
      format: src.format,
      vendorDomain: src.vendorDomain,
      active: src.active,
      lastImportAt: src.lastImportAt?.toISOString(),
      lastImportRows: src.lastImportRows,
      lastImportErrors: src.lastImportErrors,
      importCount: src._count.imports,
      notes: src.notes,
      mapping: src.mapping,
      csvDelimiter: src.csvDelimiter,
      // On ne renvoie pas config (peut contenir credentials FTP)
    })),
  });
}

/** POST /api/admin/tariffs — créer une source. */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }

  const required = ['name', 'type', 'mapping'];
  for (const r of required) if (!body[r]) return NextResponse.json({ error: `${r} manquant` }, { status: 400 });
  if (!['mail', 'ftp', 'sftp', 'http', 'manual'].includes(body.type)) {
    return NextResponse.json({ error: 'type invalide' }, { status: 400 });
  }

  const src = await prisma.tariffSource.create({
    data: {
      name: body.name,
      type: body.type,
      config: body.config || {},
      mapping: body.mapping,
      format: body.format || 'auto',
      csvDelimiter: body.csvDelimiter || ',',
      vendorDomain: body.vendorDomain || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json({ id: src.id });
}
