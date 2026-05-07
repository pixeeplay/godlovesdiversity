import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WEBCAM_SOURCES } from '@/lib/webcam-sources';
import { resolveChannelLive, resolveVideoLive } from '@/lib/webcam-resolver';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/webcams/live
 * Charge sources statiques (lib/webcam-sources) + sources DB actives (découvertes
 * par l'agent IA), puis résout chaque chaîne YouTube en parallèle.
 * Retourne UNIQUEMENT les flux dont YouTube confirme un live en cours.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  const includeOffline = url.searchParams.get('all') === '1';

  const start = Date.now();

  // 1. Sources DB actives (incluant celles ajoutées par l'agent IA)
  let dbSources: any[] = [];
  try {
    dbSources = await prisma.webcamSource.findMany({
      where: { active: true },
      select: {
        slug: true, name: true, city: true, country: true, faith: true, emoji: true,
        description: true, channelId: true, videoId: true, externalUrl: true,
        schedule: true, inclusive: true, discoveredBy: true
      }
    });
  } catch {
    // Si la migration n'est pas encore appliquée, on tombe sur les sources statiques
  }

  // 2. Merge : DB prime sur statique (sur slug)
  const bySlug = new Map<string, any>();
  for (const s of WEBCAM_SOURCES) {
    bySlug.set(s.id, { ...s, slug: s.id });
  }
  for (const s of dbSources) {
    bySlug.set(s.slug, s);
  }

  const merged = Array.from(bySlug.values());

  // 3. Résolution parallèle (timeout 8s par chaîne)
  const resolved = await Promise.all(
    merged.map(async (src: any) => {
      const live = src.videoId
        ? await resolveVideoLive(src.videoId, { force })
        : src.channelId
        ? await resolveChannelLive(src.channelId, { force })
        : { videoId: null, isLive: false, resolvedAt: Date.now() };
      return {
        id: src.slug,
        name: src.name,
        city: src.city,
        country: src.country,
        faith: src.faith,
        emoji: src.emoji,
        description: src.description,
        externalUrl: src.externalUrl,
        schedule: src.schedule,
        inclusive: !!src.inclusive,
        discoveredBy: src.discoveredBy || 'manual',
        live: live.isLive,
        videoId: live.videoId,
        liveTitle: live.title,
        thumbnailUrl: live.thumbnailUrl,
        embedUrl: live.videoId ? `https://www.youtube.com/embed/${live.videoId}?autoplay=1&rel=0` : null
      };
    })
  );

  const liveOnly = includeOffline ? resolved : resolved.filter((c) => c.live && c.videoId);

  return NextResponse.json(
    {
      ok: true,
      total: merged.length,
      live: resolved.filter((c) => c.live).length,
      offline: resolved.filter((c) => !c.live).length,
      durationMs: Date.now() - start,
      cams: liveOnly
    },
    {
      headers: {
        'cache-control': 'public, s-maxage=300, max-age=60, stale-while-revalidate=600'
      }
    }
  );
}
