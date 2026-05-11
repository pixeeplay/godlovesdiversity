import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { platformDb } from '@pixeesite/database';
import { TeamClient } from '@/components/TeamClient';

export const dynamic = 'force-dynamic';

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const { slug } = await params;
  const userId = (session.user as any).id;
  const m = await platformDb.orgMember.findFirst({
    where: { userId, org: { slug } },
    select: { role: true, org: { select: { id: true } } },
  });
  if (!m) notFound();
  const members = await platformDb.orgMember.findMany({
    where: { orgId: m.org.id },
    include: { user: { select: { email: true, name: true, avatarUrl: true } } },
  });
  const invites = await platformDb.orgInvite.findMany({
    where: { orgId: m.org.id, acceptedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  return <TeamClient orgSlug={slug} role={m.role} members={JSON.parse(JSON.stringify(members))} invites={JSON.parse(JSON.stringify(invites))} />;
}
