import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pullHttpSource } from '@/lib/tariff-ingestor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** GET /api/cron/tariffs-pull — pull toutes les sources type=http actives. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || '';
  const provided = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret') || '';
  if (secret && provided !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sources = await prisma.tariffSource.findMany({
    where: { active: true, type: 'http' },
  });

  const results = [];
  for (const src of sources) {
    try {
      const r = await pullHttpSource(src.id);
      results.push({ sourceId: src.id, name: src.name, ok: true, ...r });
    } catch (e: any) {
      results.push({ sourceId: src.id, name: src.name, ok: false, error: e?.message });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
