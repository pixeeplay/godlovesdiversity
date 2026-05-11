import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { platformDb } from '@pixeesite/database';
import { authOptions } from '@/lib/auth';
import { OrgDashboardClient } from '@/components/OrgDashboardClient';

export const dynamic = 'force-dynamic';

export default async function OrgDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const { slug } = await params;
  const userId = (session.user as any).id;

  const membership = await platformDb.orgMember.findFirst({
    where: { userId, org: { slug } },
    select: { role: true, org: { select: { id: true, slug: true, name: true, plan: true, planStatus: true, trialEndsAt: true, defaultDomain: true, tenantDbReady: true, maxSites: true, usedAiCredits: true, maxAiCredits: true, primaryColor: true, logoUrl: true } } },
  });
  if (!membership) notFound();
  const org = membership.org;

  const sites = await platformDb.site.findMany({
    where: { orgId: org.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, slug: true, name: true, status: true, pageCount: true, deployStatus: true, deployedAt: true, updatedAt: true },
  });

  return (
    <OrgDashboardClient
      org={JSON.parse(JSON.stringify(org))}
      role={membership.role}
      sites={JSON.parse(JSON.stringify(sites))}
    />
  );
}
