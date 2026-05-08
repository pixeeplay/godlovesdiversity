import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { exploreSite, type CrawlOptions } from '@/lib/site-crawler';

export const maxDuration = 60; // Coolify peut tenir, Vercel-style timeout safe

/**
 * POST /api/admin/knowledge/explore
 * Body : { url, maxDepth?, maxPages?, respectRobots?, includeSubdomains?, followExternal? }
 * Réponse : { root: CrawlNode, totalPages, source, warnings[] }
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  if (!body?.url || typeof body.url !== 'string') {
    return NextResponse.json({ error: 'url manquante' }, { status: 400 });
  }

  const opts: CrawlOptions = {
    maxDepth: body.maxDepth,
    maxPages: body.maxPages,
    respectRobots: body.respectRobots,
    includeSubdomains: body.includeSubdomains,
    followExternal: body.followExternal,
  };

  try {
    const result = await exploreSite(body.url, opts);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Exploration impossible' }, { status: 500 });
  }
}
