import { NextRequest, NextResponse } from 'next/server';
import { platformDb, getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orgs/[slug]/sites
 * Liste les sites de l'org.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { membership } = await requireOrgMember(slug);
    const sites = await platformDb.site.findMany({
      where: { orgId: membership.org.id },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ sites });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'UNAUTHORIZED' ? 401 : 403 });
  }
}

/**
 * POST /api/orgs/[slug]/sites
 * Body: { name, slug, templateId? }
 *
 * Crée un site + sa page d'accueil dans la tenant DB.
 * Si templateId est fourni, clone les blocksSeed du template.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try {
    auth = await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const name = (body.name as string)?.trim();
  const siteSlug = (body.slug as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const templateId = body.templateId as string | undefined;

  if (!name || !siteSlug) {
    return NextResponse.json({ error: 'name-and-slug-required' }, { status: 400 });
  }

  // Check plan limits
  const sitesCount = await platformDb.site.count({ where: { orgId: auth.membership.org.id } });
  if (sitesCount >= auth.membership.org.maxSites) {
    return NextResponse.json({ error: 'plan-limit-reached', limit: auth.membership.org.maxSites, current: sitesCount }, { status: 402 });
  }

  // Check slug unique within org
  const existing = await platformDb.site.findUnique({ where: { orgId_slug: { orgId: auth.membership.org.id, slug: siteSlug } } }).catch(() => null);
  if (existing) return NextResponse.json({ error: 'slug-taken' }, { status: 409 });

  // Récupère le template si fourni
  let templateBlocks: any = null;
  if (templateId) {
    const template = await platformDb.template.findUnique({ where: { id: templateId } });
    if (!template) return NextResponse.json({ error: 'template-not-found' }, { status: 404 });
    templateBlocks = template.blocksSeed;
    // Increment template install count
    await platformDb.template.update({ where: { id: templateId }, data: { installCount: { increment: 1 }, popularity: { increment: 1 } } }).catch(() => {});
  }

  // Crée le site dans platform DB
  const site = await platformDb.site.create({
    data: {
      orgId: auth.membership.org.id,
      slug: siteSlug,
      name,
      status: 'draft',
      templateId,
    },
  });

  // Crée les pages dans tenant DB
  const tenantDb = await getTenantPrisma(orgSlug);
  if (templateBlocks?.pages && Array.isArray(templateBlocks.pages)) {
    // Depuis template
    for (const p of templateBlocks.pages) {
      await tenantDb.sitePage.create({
        data: {
          siteId: site.id,
          slug: p.slug || '/',
          title: p.title || 'Page',
          blocks: p.blocks || [],
          isHome: p.isHome || p.slug === '/',
          visible: true,
          meta: p.meta || null,
        },
      });
    }
  } else {
    // Page d'accueil par défaut
    await tenantDb.sitePage.create({
      data: {
        siteId: site.id,
        slug: '/',
        title: name,
        isHome: true,
        visible: true,
        blocks: [
          {
            type: 'parallax-hero', width: 'full', effect: 'fade-up', effectDelay: 0,
            data: {
              title: name,
              subtitle: 'À toi de jouer ✨',
              ctaLabel: 'Découvrir',
              ctaHref: '#contenu',
              bgGradient: 'linear-gradient(180deg, #1e1b4b, #4c1d95, #d946ef)',
              floatingText: name.toUpperCase().slice(0, 12),
              height: '70vh',
            },
          },
          {
            type: 'text', width: 'full', effect: 'fade-up', effectDelay: 100,
            data: { html: '<h2 id="contenu">Bienvenue sur ton nouveau site</h2><p>Édite cette page dans le builder pour la personnaliser. Ajoute des blocs, génère des images IA, choisis un thème.</p>' },
          },
        ],
      },
    });
  }

  // Update pageCount
  const pageCount = await tenantDb.sitePage.count({ where: { siteId: site.id } });
  await platformDb.site.update({ where: { id: site.id }, data: { pageCount } });

  // Audit
  await platformDb.platformAuditLog.create({
    data: {
      userId: auth.userId,
      orgId: auth.membership.org.id,
      action: templateId ? 'site.create-from-template' : 'site.create',
      resource: `site:${site.id}`,
      metadata: { templateId, siteSlug },
    },
  });

  return NextResponse.json({ ok: true, site }, { status: 201 });
}
