import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { platformDb, getTenantPrisma } from '@pixeesite/database';
import { SiteDetailClient } from '@/components/SiteDetailClient';

export const dynamic = 'force-dynamic';

export default async function SiteDetailPage({ params }: { params: Promise<{ slug: string; siteSlug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const { slug: orgSlug, siteSlug } = await params;
  const userId = (session.user as any).id;

  const membership = await platformDb.orgMember.findFirst({
    where: { userId, org: { slug: orgSlug } },
    select: { role: true, org: { select: { id: true, slug: true, name: true, defaultDomain: true } } },
  });
  if (!membership) notFound();

  const site = await platformDb.site.findUnique({
    where: { orgId_slug: { orgId: membership.org.id, slug: siteSlug } },
  });
  if (!site) notFound();

  // Pages depuis tenant DB
  let pages: any[] = [];
  try {
    const tenantDb = await getTenantPrisma(orgSlug);
    pages = await tenantDb.sitePage.findMany({
      where: { siteId: site.id },
      orderBy: [{ isHome: 'desc' }, { slug: 'asc' }],
      select: { id: true, slug: true, title: true, isHome: true, visible: true, updatedAt: true, blocks: true },
    });
  } catch (e) {
    console.error('[site-detail] tenant DB error', e);
  }

  return (
    <SiteDetailClient
      orgSlug={orgSlug}
      orgName={membership.org.name}
      orgDefaultDomain={membership.org.defaultDomain}
      site={JSON.parse(JSON.stringify(site))}
      pages={pages.map((p) => ({ ...p, blocksCount: Array.isArray(p.blocks) ? p.blocks.length : 0, blocks: undefined }))}
      role={membership.role}
    />
  );
}
