import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { platformDb } from '@pixeesite/database';
import { OrgSitesClient } from '@/components/OrgSitesClient';

export const dynamic = 'force-dynamic';

export default async function OrgSitesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=/dashboard/orgs/${orgSlug}/sites`);

  const org = await platformDb.org.findUnique({
    where: { slug: orgSlug },
    select: {
      id: true, slug: true, name: true, plan: true, maxSites: true,
      sites: {
        orderBy: { updatedAt: 'desc' },
        select: { id: true, slug: true, name: true, status: true, pageCount: true, updatedAt: true },
      },
      _count: { select: { sites: true } },
    },
  });
  if (!org) redirect('/dashboard');

  const canCreateMore = org.maxSites === -1 || org._count.sites < (org.maxSites || 999);

  // Serialize dates
  const sites = org.sites.map((s) => ({ ...s, updatedAt: s.updatedAt.toISOString() }));

  return <OrgSitesClient orgSlug={orgSlug} initialSites={sites} canCreateMore={canCreateMore} />;
}
