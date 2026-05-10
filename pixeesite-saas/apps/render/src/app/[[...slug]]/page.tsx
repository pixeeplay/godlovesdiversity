import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantPrisma, platformDb } from '@pixeesite/database';
// import { PageBlocksRenderer } from '@pixeesite/blocks';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // CDN cache 60s, revalidate on publish webhook

/**
 * Catch-all qui rend N'IMPORTE QUELLE page de N'IMPORTE QUEL tenant.
 * URL : /     → home du site primary de l'org
 * URL : /about → /about du site primary
 *
 * Le orgSlug vient du middleware via header x-pixeesite-org-slug.
 */
export default async function TenantPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const orgSlug = headers().get('x-pixeesite-org-slug');
  if (!orgSlug) notFound();

  const slugPath = '/' + (slug || []).join('/');

  // 1. Trouve le site "primary" de l'org (status=published)
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
        select: { id: true, slug: true, theme: true },
      },
    },
  });
  if (!org || org.sites.length === 0) notFound();
  const site = org.sites[0];

  // 2. Récupère la page demandée dans la tenant DB
  const tenantDb = await getTenantPrisma(orgSlug);
  const page = await tenantDb.sitePage.findFirst({
    where: {
      siteId: site.id,
      slug: slugPath,
      visible: true,
    },
  });
  if (!page) notFound();

  return (
    <main>
      {/* TODO: <PageBlocksRenderer blocks={page.blocks} theme={site.theme || org} /> */}
      <h1>{page.title}</h1>
      <p>Org: {orgSlug} · Slug: {slugPath}</p>
      <pre style={{ fontSize: 11, opacity: 0.5 }}>{JSON.stringify(page.blocks, null, 2)}</pre>
    </main>
  );
}
