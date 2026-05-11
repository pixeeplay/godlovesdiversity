/**
 * /api/orgs/[slug]/scraper-jobs/[id] — état d'un job pour polling + cancel.
 *
 * GET    : retourne { id, status, progress, total, done, errors, logs[], results[], startedAt, finishedAt }
 * DELETE : marque le job 'cancelled' (le runner check ce flag entre pages).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug: orgSlug, id } = await params;
  try { await requireOrgMember(orgSlug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const tenantDb = await getTenantPrisma(orgSlug);
  const rows: any[] = await (tenantDb as any).$queryRawUnsafe(`SELECT id, name, "sourceUrl", depth, status, "leadCount", "errorCount", config, results, "startedAt", "finishedAt" FROM "ScraperJob" WHERE id = $1`, id).catch(() => []);
  const row = rows[0];
  if (!row) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  const r = row.results || {};
  return NextResponse.json({
    id: row.id,
    status: row.status,
    name: row.name,
    sourceUrl: row.sourceUrl,
    total: r.total || 0,
    done: r.done || 0,
    errors: r.errors || 0,
    progress: r.progress || 0,
    currentUrl: r.currentUrl,
    logs: r.logs || [],
    results: r.results || [],
    startedAt: row.startedAt ? new Date(row.startedAt).getTime() : undefined,
    finishedAt: row.finishedAt ? new Date(row.finishedAt).getTime() : undefined,
    leadCount: row.leadCount,
    errorCount: row.errorCount,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug: orgSlug, id } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const tenantDb = await getTenantPrisma(orgSlug);
  await (tenantDb as any).$executeRawUnsafe(`UPDATE "ScraperJob" SET status = 'cancelled', "finishedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1 AND status IN ('queued', 'running')`, id);
  return NextResponse.json({ ok: true });
}
