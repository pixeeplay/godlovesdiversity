import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { platformDb, getTenantPrisma } from '@pixeesite/database';
import { PageBuilderEditor } from '@/components/PageBuilderEditor';

export const dynamic = 'force-dynamic';

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; siteSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const { slug: orgSlug, siteSlug } = await params;
  const { page: pageSlug } = await searchParams;
  const userId = (session.user as any).id;

  const membership = await platformDb.orgMember.findFirst({
    where: { userId, org: { slug: orgSlug } },
    select: {
      role: true,
      org: { select: { id: true, slug: true, name: true, primaryColor: true, font: true, defaultDomain: true } },
    },
  });
  if (!membership) notFound();

  const site = await platformDb.site.findUnique({
    where: { orgId_slug: { orgId: membership.org.id, slug: siteSlug } },
  });
  if (!site) notFound();

  const tenantDb = await getTenantPrisma(orgSlug);
  const targetSlug = pageSlug || '/';
  const page = await tenantDb.sitePage.findFirst({
    where: { siteId: site.id, slug: targetSlug.startsWith('/') ? targetSlug : `/${targetSlug}` },
  });
  if (!page) notFound();

  // Liste des autres pages pour le sidebar de navigation
  const allPages = await tenantDb.sitePage.findMany({
    where: { siteId: site.id },
    orderBy: [{ isHome: 'desc' }, { slug: 'asc' }],
    select: { id: true, slug: true, title: true, isHome: true },
  });

  return (
    <PageBuilderEditor
      orgSlug={orgSlug}
      siteSlug={site.slug}
      siteName={site.name}
      pageId={page.id}
      pageSlug={page.slug}
      pageTitle={page.title}
      initialBlocks={(page.blocks as any[]) || []}
      allPages={allPages}
      orgDefaultDomain={membership.org.defaultDomain}
      theme={{
        primary: membership.org.primaryColor,
        font: membership.org.font,
      }}
      canEdit={['owner', 'admin', 'editor'].includes(membership.role)}
    />
  );
}
