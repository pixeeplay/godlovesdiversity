import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startScrapeJob, listJobs, type ScrapeJobOptions } from '@/lib/scrape-jobs';

/**
 * POST /api/admin/knowledge/scrape
 * Body : { urls: string[], summarize?, ingest?, skipJina?, concurrency?, tags?, locale? }
 * Réponse : { id, status, total } — l'UI poll ensuite GET /scrape/[id] pour la progression
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

  if (!Array.isArray(body?.urls) || body.urls.length === 0) {
    return NextResponse.json({ error: 'urls[] manquant ou vide' }, { status: 400 });
  }
  if (body.urls.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 URLs par job' }, { status: 400 });
  }

  const opts: ScrapeJobOptions = {
    urls: body.urls.filter((u: any) => typeof u === 'string'),
    summarize: !!body.summarize,
    ingest: body.ingest !== false,
    skipJina: !!body.skipJina,
    concurrency: body.concurrency,
    polite: body.polite !== false,
    hostDelayMs: typeof body.hostDelayMs === 'number' ? body.hostDelayMs : undefined,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    locale: typeof body.locale === 'string' ? body.locale : undefined,
  };

  const job = startScrapeJob(opts);
  return NextResponse.json({
    id: job.id,
    status: job.status,
    total: job.total,
  });
}

/**
 * GET /api/admin/knowledge/scrape
 * Liste les 20 derniers jobs (admin debug).
 */
export async function GET(_req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({
    jobs: listJobs(20).map((j) => ({
      id: j.id,
      status: j.status,
      createdAt: j.createdAt,
      total: j.total,
      done: j.done,
      errors: j.errors,
    })),
  });
}
