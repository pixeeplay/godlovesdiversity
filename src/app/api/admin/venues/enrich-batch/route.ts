import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enrichVenue } from '@/lib/venue-enrich';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min max — Coolify peut être patient

/**
 * POST /api/admin/venues/enrich-batch
 *
 * Body : { ids?: string[], limit?: number, mode?: "stale"|"empty"|"all", overwrite?: boolean }
 *
 * Modes (si pas d'IDs explicites) :
 *  - "stale"  : enrichit les venues les plus anciennes (enrichedAt NULL ou > 30j) — défaut
 *  - "empty"  : enrichit ceux sans téléphone/email/website/coords
 *  - "all"    : tout
 *
 * Limite par défaut : 20 (Gemini Flash supporte ~60 req/min, on reste safe).
 *
 * Utilisé par :
 *  - bouton "Enrichir N sélectionnés" sur /admin/venues
 *  - Scheduled task Claude quotidien (POST avec mode=stale, limit=50)
 *
 * Authentification : ADMIN/EDITOR session OU header X-Cron-Secret matchant CRON_SECRET env.
 */
export async function POST(req: NextRequest) {
  // Auth : session admin OR cron secret
  const cronSecret = req.headers.get('x-cron-secret');
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;
  if (!isCron) {
    const s = await getServerSession(authOptions);
    if (!s?.user || !['ADMIN', 'EDITOR'].includes((s.user as any).role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = Array.isArray(body.ids) && body.ids.length ? body.ids : undefined;
  const limit = Math.min(parseInt(body.limit) || 20, 100);
  const mode = (body.mode as 'stale' | 'empty' | 'all') || 'stale';
  const overwrite = !!body.overwrite;

  let venues;
  if (ids) {
    venues = await prisma.venue.findMany({ where: { id: { in: ids } }, take: limit });
  } else {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let where: any = {};
    if (mode === 'stale') {
      where = { OR: [{ enrichedAt: null }, { enrichedAt: { lt: thirtyDaysAgo } }] };
    } else if (mode === 'empty') {
      where = {
        OR: [
          { phone: null },
          { website: null },
          { email: null },
          { lat: null }
        ]
      };
    }
    venues = await prisma.venue.findMany({
      where,
      take: limit,
      orderBy: [{ enrichedAt: { sort: 'asc', nulls: 'first' } }, { updatedAt: 'asc' }]
    });
  }

  const results: any[] = [];
  let enriched = 0;
  let skipped = 0;
  const startedAt = Date.now();

  for (const v of venues) {
    try {
      const r = await enrichVenue({
        name: v.name,
        city: v.city,
        address: v.address,
        country: v.country,
        type: v.type,
        existing: { phone: v.phone, email: v.email, website: v.website, facebook: v.facebook, instagram: v.instagram }
      });

      if (!r.ok) {
        skipped++;
        results.push({ id: v.id, name: v.name, ok: false, error: r.error });
        continue;
      }

      // Construit le patch (overwrite ou complétion seulement)
      const patch: any = {};
      const existing = v as any;
      for (const [k, val] of Object.entries(r.patch)) {
        if (val === undefined || val === null) continue;
        if (Array.isArray(val) && val.length === 0) continue;
        if (overwrite || !existing[k] || (Array.isArray(existing[k]) && existing[k].length === 0)) {
          patch[k] = val;
        }
      }
      patch.enrichedAt = new Date();
      patch.enrichmentConfidence = r.confidence;
      patch.enrichmentSources = r.sources;
      patch.enrichmentNotes = r.notes;

      await prisma.venue.update({ where: { id: v.id }, data: patch });
      enriched++;
      results.push({
        id: v.id,
        name: v.name,
        ok: true,
        confidence: r.confidence,
        fieldsApplied: Object.keys(patch).filter((k) => !k.startsWith('enrichment') && k !== 'enrichedAt'),
        sources: r.sources.length
      });
    } catch (e: any) {
      skipped++;
      results.push({ id: v.id, name: v.name, ok: false, error: e.message });
    }

    // Rate-limit Gemini : 60 req/min sur le free tier → ~1.1s entre 2 calls
    await new Promise((r) => setTimeout(r, 1100));

    // Safety : si on dépasse 4.5 min on stoppe (maxDuration=300)
    if (Date.now() - startedAt > 270_000) {
      results.push({ stopped: 'max-duration-approaching' });
      break;
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    enriched,
    skipped,
    durationMs: Date.now() - startedAt,
    mode,
    results
  });
}

/**
 * GET /api/admin/venues/enrich-batch
 * Renvoie les stats d'enrichissement.
 */
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });

  const total = await prisma.venue.count();
  const enriched = await prisma.venue.count({ where: { enrichedAt: { not: null } } });
  const stale = await prisma.venue.count({
    where: {
      OR: [
        { enrichedAt: null },
        { enrichedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      ]
    }
  });
  const highConf = await prisma.venue.count({ where: { enrichmentConfidence: { gte: 0.75 } } });
  const lowConf = await prisma.venue.count({ where: { enrichmentConfidence: { lt: 0.5, gt: 0 } } });

  return NextResponse.json({
    total,
    enriched,
    stale,
    pctEnriched: total ? Math.round((enriched / total) * 100) : 0,
    highConfidence: highConf,
    lowConfidence: lowConf
  });
}
