import { NextRequest, NextResponse } from 'next/server';
import { platformDb, getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orgs/[slug]/sites/[siteSlug]
 * Récupère un site avec ses pages tenant (read-only).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; siteSlug: string }> }) {
  const { slug, siteSlug } = await params;
  try {
    const { membership } = await requireOrgMember(slug);
    const site = await platformDb.site.findUnique({
      where: { orgId_slug: { orgId: membership.org.id, slug: siteSlug } },
    });
    if (!site) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    let pages: any[] = [];
    try {
      const db = await getTenantPrisma(slug);
      pages = await db.sitePage.findMany({ where: { siteId: site.id }, orderBy: [{ isHome: 'desc' }, { slug: 'asc' }] });
    } catch { /* tenant DB pas prête, on ignore */ }
    return NextResponse.json({ ok: true, site, pages });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'UNAUTHORIZED' ? 401 : 403 });
  }
}

/**
 * DELETE /api/orgs/[slug]/sites/[siteSlug]
 * Supprime le site (platform DB) + toutes les SitePage tenant DB.
 * Réservé aux roles owner|admin.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; siteSlug: string }> }) {
  const { slug, siteSlug } = await params;
  let auth;
  try {
    auth = await requireOrgMember(slug, ['owner', 'admin']);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'UNAUTHORIZED' ? 401 : 403 });
  }

  const site = await platformDb.site.findUnique({
    where: { orgId_slug: { orgId: auth.membership.org.id, slug: siteSlug } },
    select: { id: true, name: true, slug: true },
  });
  if (!site) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  // 1. Supprime les pages tenant (best effort — tenant DB peut être down)
  let pagesDeleted = 0;
  try {
    const db = await getTenantPrisma(slug);
    const r = await db.sitePage.deleteMany({ where: { siteId: site.id } });
    pagesDeleted = r.count;
  } catch (e: any) {
    console.error('[sites DELETE] tenant pages cleanup failed:', e?.message);
  }

  // 2. Supprime le site (platform DB)
  await platformDb.site.delete({ where: { id: site.id } });

  // 3. Audit
  await platformDb.platformAuditLog.create({
    data: {
      userId: auth.userId,
      orgId: auth.membership.org.id,
      action: 'site.delete',
      resource: `site:${site.id}`,
      metadata: { siteSlug: site.slug, name: site.name, pagesDeleted },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, pagesDeleted });
}

/**
 * PATCH /api/orgs/[slug]/sites/[siteSlug]
 * Update partiel : name, description, status, theme, settings.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; siteSlug: string }> }) {
  const { slug, siteSlug } = await params;
  let auth;
  try {
    auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const site = await platformDb.site.findUnique({
    where: { orgId_slug: { orgId: auth.membership.org.id, slug: siteSlug } },
    select: { id: true },
  });
  if (!site) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  const data: any = {};
  if (typeof body.name === 'string') data.name = body.name.trim().slice(0, 120);
  if (typeof body.description === 'string') data.description = body.description.slice(0, 500);
  if (typeof body.status === 'string' && ['draft', 'published', 'archived'].includes(body.status)) data.status = body.status;
  if (body.theme !== undefined) data.theme = body.theme;
  if (body.settings !== undefined) data.settings = body.settings;
  const updated = await platformDb.site.update({ where: { id: site.id }, data });
  return NextResponse.json({ ok: true, site: updated });
}
