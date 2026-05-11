/**
 * /api/orgs/[slug]/scraper-jobs — gestion des jobs de scrape (table ScraperJob, raw SQL).
 *
 * GET  : liste les jobs (history).
 * POST : crée un nouveau job, lance le scrap async (fire-and-forget), retourne l'id pour polling.
 *
 * Table tenant `ScraperJob` (cf. tenant-init.ts) :
 *   id, name, sourceUrl, depth, status, leadCount, errorCount, config JSONB, results JSONB,
 *   startedAt, finishedAt, createdAt, updatedAt
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { runScrapeJob } from '@/lib/scraper-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function cuid(): string {
  // Cuid-style fallback (sans dépendre de @paralleldrive/cuid2)
  return 'c' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  try { await requireOrgMember(orgSlug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const tenantDb = await getTenantPrisma(orgSlug);
  const items = await (tenantDb as any).$queryRawUnsafe(`SELECT id, name, "sourceUrl", depth, status, "leadCount", "errorCount", config, results, "startedAt", "finishedAt", "createdAt", "updatedAt" FROM "ScraperJob" ORDER BY "createdAt" DESC LIMIT 50`).catch(() => []);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const orgId = auth.membership.org.id;

  const body = await req.json().catch(() => ({}));
  const urls: string[] = Array.isArray(body.urls) ? body.urls.filter((u: any) => typeof u === 'string') : [];
  const sourceUrl: string = body.sourceUrl || urls[0] || '';
  if (!sourceUrl || urls.length === 0) return NextResponse.json({ error: 'urls-required' }, { status: 400 });

  const depth = typeof body.depth === 'number' ? Math.min(5, Math.max(0, body.depth)) : 1;

  const config = {
    urls,
    depth,
    cleaner: body.cleaner || 'aggressive',
    cleanerHint: body.cleanerHint,
    summarize: !!body.summarize,
    ingest: body.ingest !== false,
    skipJina: !!body.skipJina,
    polite: body.polite !== false,
    hostDelayMs: typeof body.hostDelayMs === 'number' ? body.hostDelayMs : 2500,
    concurrency: body.concurrency || 1,
    tags: Array.isArray(body.tags) ? body.tags : [],
    country: body.country || 'FR',
    target: body.target || 'b2b',
    importToLeads: body.importToLeads !== false
  };

  const tenantDb = await getTenantPrisma(orgSlug);
  const id = cuid();
  await (tenantDb as any).$executeRawUnsafe(
    `INSERT INTO "ScraperJob" ("id", "name", "sourceUrl", "depth", "status", "leadCount", "errorCount", "config", "results", "startedAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'queued', 0, 0, $5::jsonb, $6::jsonb, NOW(), NOW(), NOW())`,
    id,
    body.name || sourceUrl,
    sourceUrl,
    depth,
    JSON.stringify(config),
    JSON.stringify({ logs: [], results: [], progress: 0, done: 0, total: urls.length, errors: 0 })
  );

  // Lance le runner en arrière-plan
  void runScrapeJob({ orgSlug, orgId, jobId: id }).catch((e: any) => {
    console.error('scrape-job-error', id, e?.message || e);
  });

  return NextResponse.json({ ok: true, id });
}
