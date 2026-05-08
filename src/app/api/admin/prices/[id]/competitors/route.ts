import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addCompetitorToWatch } from '@/lib/price-tracker';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/admin/prices/[id]/competitors — ajoute une URL concurrent au watch.
 * Body : { url }
 */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }
  if (!body?.url) return NextResponse.json({ error: 'url manquante' }, { status: 400 });

  try {
    const r = await addCompetitorToWatch(ctx.params.id, body.url);
    return NextResponse.json({
      competitorId: r.competitor.id,
      domain: r.competitor.domain,
      priceCents: r.extracted.priceCents,
      method: r.extracted.method,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'add KO' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/prices/[id]/competitors?competitorId=xxx — retire un concurrent.
 */
export async function DELETE(req: NextRequest, _ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const competitorId = req.nextUrl.searchParams.get('competitorId');
  if (!competitorId) return NextResponse.json({ error: 'competitorId manquant' }, { status: 400 });

  try {
    await prisma.competitorProduct.delete({ where: { id: competitorId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'delete KO' }, { status: 500 });
  }
}
