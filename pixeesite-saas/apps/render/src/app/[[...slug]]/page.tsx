import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantPrisma, platformDb } from '@pixeesite/database';
import { PageBlocksRenderer, EffectsStyles, type Block, type SiteTheme } from '@pixeesite/blocks';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

/**
 * Catch-all qui rend N'IMPORTE QUELLE page de N'IMPORTE QUEL tenant.
 * URL : /         → home du site primary de l'org
 * URL : /about    → /about du site primary
 *
 * Le orgSlug vient du middleware via header x-pixeesite-org-slug.
 */
export default async function TenantPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const orgSlug = headers().get('x-pixeesite-org-slug');
  if (!orgSlug) notFound();

  const slugPath = slug && slug.length > 0 ? '/' + slug.join('/') : '/';

  // 1. Trouve le site "primary" de l'org publié
  const org = await platformDb.org.findUnique({
    where: { slug: orgSlug },
    select: {
      id: true,
      name: true,
      primaryColor: true,
      font: true,
      sites: {
        where: { status: 'published' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { id: true, slug: true, theme: true, name: true },
      },
    },
  });
  if (!org || org.sites.length === 0) notFound();
  const site = org.sites[0]!;

  // 2. Récupère la page demandée dans la tenant DB
  const tenantDb = await getTenantPrisma(orgSlug);
  const page = await tenantDb.sitePage.findFirst({
    where: { siteId: site.id, slug: slugPath, visible: true },
  });
  if (!page) notFound();

  // 3. Resolve theme : Site.theme override Org defaults
  const theme: SiteTheme = {
    primary: org.primaryColor,
    fontHeading: org.font,
    fontBody: org.font,
    ...(site.theme as SiteTheme || {}),
  };

  // 4. Rend les blocs (JSON column → array de Block)
  const blocks = (page.blocks as unknown as Block[]) || [];

  return (
    <>
      <EffectsStyles />
      <PageBlocksRenderer blocks={blocks} theme={theme} />
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const orgSlug = headers().get('x-pixeesite-org-slug');
  if (!orgSlug) return { title: 'Pixeesite' };
  const { slug } = await params;
  const slugPath = slug && slug.length > 0 ? '/' + slug.join('/') : '/';
  try {
    const org = await platformDb.org.findUnique({
      where: { slug: orgSlug },
      select: { name: true, sites: { where: { status: 'published' }, take: 1, select: { id: true } } },
    });
    if (!org || !org.sites[0]) return { title: 'Pixeesite' };
    const tenantDb = await getTenantPrisma(orgSlug);
    const page = await tenantDb.sitePage.findFirst({
      where: { siteId: org.sites[0].id, slug: slugPath },
      select: { title: true, meta: true },
    });
    if (!page) return { title: org.name };
    const meta: any = page.meta || {};
    return {
      title: meta.title || `${page.title} · ${org.name}`,
      description: meta.description,
      openGraph: meta.ogImage ? { images: [meta.ogImage] } : undefined,
    };
  } catch {
    return { title: 'Pixeesite' };
  }
}
