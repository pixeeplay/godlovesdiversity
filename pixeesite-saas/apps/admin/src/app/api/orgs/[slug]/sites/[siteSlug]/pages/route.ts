import { NextRequest, NextResponse } from 'next/server';
import { platformDb, getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/sites/[siteSlug]/pages
 * Body: { title, slug, blocks?, isHome? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string; siteSlug: string }> }) {
  const { slug: orgSlug, siteSlug } = await params;
  let auth;
  try {
    auth = await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title as string)?.trim();
  let pageSlug = (body.slug as string)?.trim() || '/';
  if (!pageSlug.startsWith('/')) pageSlug = '/' + pageSlug;
  pageSlug = pageSlug.toLowerCase().replace(/[^a-z0-9-/]/g, '-').replace(/-+/g, '-');

  if (!title) return NextResponse.json({ error: 'title-required' }, { status: 400 });

  try {
    const site = await platformDb.site.findUnique({
      where: { orgId_slug: { orgId: auth.membership.org.id, slug: siteSlug } },
    });
    if (!site) return NextResponse.json({ error: 'site-not-found' }, { status: 404 });

    const tenantDb = await getTenantPrisma(orgSlug);
    // Auto-uniquify slug
    let finalSlug = pageSlug;
    let counter = 2;
    while (await tenantDb.sitePage.findUnique({ where: { siteId_slug: { siteId: site.id, slug: finalSlug } } }).catch(() => null)) {
      finalSlug = `${pageSlug}-${counter++}`;
      if (counter > 100) break;
    }

    const page = await tenantDb.sitePage.create({
      data: {
        siteId: site.id,
        slug: finalSlug,
        title,
        isHome: body.isHome === true,
        visible: true,
        blocks: body.blocks || [
          {
            type: 'parallax-hero', width: 'full', effect: 'fade-up', effectDelay: 0,
            data: {
              title: title,
              subtitle: 'Édite cette page dans le builder',
              ctaLabel: 'Découvrir', ctaHref: '#contenu',
              bgGradient: 'linear-gradient(180deg, #1e1b4b, #4c1d95, #d946ef)',
              floatingText: title.toUpperCase().slice(0, 12), height: '70vh',
            },
          },
        ],
      },
    });

    const pageCount = await tenantDb.sitePage.count({ where: { siteId: site.id } });
    await platformDb.site.update({ where: { id: site.id }, data: { pageCount } }).catch(() => {});

    return NextResponse.json({ ok: true, page }, { status: 201 });
  } catch (e: any) {
    console.error('[pages POST]', e?.message);
    return NextResponse.json({
      error: 'tenant-db-error',
      detail: e?.message?.slice(0, 300) || 'Unknown',
      hint: 'Va dans /admin/orgs et clique "Init tenant nono" pour créer la table SitePage manquante.',
    }, { status: 500 });
  }
}
