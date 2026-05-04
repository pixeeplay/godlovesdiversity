import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startTranslateAllJob, getJob } from '@/lib/translate-job';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/i18n/translate-all
 * Démarre un job en arrière-plan, renvoie immédiatement un jobId.
 * GET /api/admin/i18n/translate-all?jobId=XXX
 * Renvoie l'état du job pour la barre de progression.
 */
export async function POST() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = startTranslateAllJob();
  return NextResponse.json({ ok: true, jobId: id });
}

export async function GET(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const jobId = new URL(req.url).searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'jobId requis' }, { status: 400 });

  const job = getJob(jobId);
  if (!job) return NextResponse.json({ error: 'job introuvable (peut-être expiré)' }, { status: 404 });

  return NextResponse.json(job);
}
