import { NextRequest, NextResponse } from 'next/server';
import { platformDb, getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/orgs/[slug]/sites/[siteSlug]/pages/[pageId]
 * Update title, slug, blocks, visible, isHome, meta
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; siteSlug: string; pageId: string }> }) {
  const { slug: orgSlug, siteSlug, pageId } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const tenantDb = await getTenantPrisma(orgSlug);

  // Snapshot pour versioning si on edit blocks
  if (body.blocks && body.snapshotBefore) {
    const current = await tenantDb.sitePage.findUnique({ where: { id: pageId } });
    if (current) {
      const site = await platformDb.site.findFirst({ where: { id: current.siteId, orgId: auth.membership.org.id } });
      if (site) {
        const lastVersion = await platformDb.siteVersion.findFirst({
          where: { siteId: site.id }, orderBy: { version: 'desc' }, select: { version: true },
        });
        await platformDb.siteVersion.create({
          data: {
            siteId: site.id,
            version: (lastVersion?.version || 0) + 1,
            snapshot: { pageId: current.id, slug: current.slug, blocks: current.blocks },
            reason: 'manual', authorId: auth.userId,
          },
        }).catch(() => {});
      }
    }
  }

  const updates: any = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.slug !== undefined) updates.slug = body.slug.startsWith('/') ? body.slug : '/' + body.slug;
  if (body.blocks !== undefined) updates.blocks = body.blocks;
  if (body.visible !== undefined) updates.visible = body.visible;
  if (body.isHome !== undefined) updates.isHome = body.isHome;
  if (body.meta !== undefined) updates.meta = body.meta;
  if (body.noIndex !== undefined) updates.noIndex = body.noIndex;

  const updated = await tenantDb.sitePage.update({ where: { id: pageId }, data: updates });
  return NextResponse.json({ ok: true, page: updated });
}

/**
 * DELETE /api/orgs/[slug]/sites/[siteSlug]/pages/[pageId]
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; siteSlug: string; pageId: string }> }) {
  const { slug: orgSlug, siteSlug, pageId } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const tenantDb = await getTenantPrisma(orgSlug);
  const page = await tenantDb.sitePage.findUnique({ where: { id: pageId } });
  if (page?.isHome) return NextResponse.json({ error: 'cannot-delete-home' }, { status: 400 });
  await tenantDb.sitePage.delete({ where: { id: pageId } });
  return NextResponse.json({ ok: true });
}
