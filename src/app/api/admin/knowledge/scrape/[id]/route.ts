import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getJob, cancelJob } from '@/lib/scrape-jobs';

/**
 * GET /api/admin/knowledge/scrape/[id]
 * Renvoie l'état complet d'un job (pollé toutes les 1s par l'UI).
 *
 * Query param ?since=<ts> pour ne renvoyer que les logs après ce timestamp (économie bande passante).
 */
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const job = getJob(ctx.params.id);
  if (!job) return NextResponse.json({ error: 'job introuvable' }, { status: 404 });

  const sinceParam = req.nextUrl.searchParams.get('since');
  const since = sinceParam ? Number(sinceParam) : 0;

  const filteredLogs = since > 0 ? job.logs.filter((l) => l.ts > since) : job.logs.slice(-100);

  return NextResponse.json({
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    total: job.total,
    done: job.done,
    errors: job.errors,
    currentUrl: job.currentUrl,
    progress: job.total > 0 ? Math.round((job.done / job.total) * 100) : 0,
    logs: filteredLogs,
    results: job.results.slice(-50),
    options: {
      summarize: job.options.summarize,
      ingest: job.options.ingest,
      skipJina: job.options.skipJina,
      concurrency: job.options.concurrency,
    },
  });
}

/**
 * DELETE /api/admin/knowledge/scrape/[id]
 * Annule un job en cours.
 */
export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ok = cancelJob(ctx.params.id);
  if (!ok) return NextResponse.json({ error: 'job déjà terminé ou introuvable' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
