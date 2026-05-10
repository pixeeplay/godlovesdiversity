import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/sites/[siteSlug]/publish
 * Marque le site comme published. Le rendu est instantané puisque le
 * render app lit la tenant DB en live.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; siteSlug: string }> }) {
  const { slug: orgSlug, siteSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const site = await platformDb.site.findUnique({
    where: { orgId_slug: { orgId: auth.membership.org.id, slug: siteSlug } },
  });
  if (!site) return NextResponse.json({ error: 'site-not-found' }, { status: 404 });

  const updated = await platformDb.site.update({
    where: { id: site.id },
    data: {
      status: 'published',
      deployStatus: 'live',
      deployedAt: new Date(),
    },
  });

  await platformDb.platformAuditLog.create({
    data: {
      userId: auth.userId,
      orgId: auth.membership.org.id,
      action: 'site.publish',
      resource: `site:${site.id}`,
      metadata: { siteSlug },
    },
  });

  return NextResponse.json({ ok: true, site: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; siteSlug: string }> }) {
  const { slug: orgSlug, siteSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const site = await platformDb.site.findUnique({
    where: { orgId_slug: { orgId: auth.membership.org.id, slug: siteSlug } },
  });
  if (!site) return NextResponse.json({ error: 'site-not-found' }, { status: 404 });

  await platformDb.site.update({
    where: { id: site.id },
    data: { status: 'draft', deployStatus: null },
  });

  return NextResponse.json({ ok: true });
}
