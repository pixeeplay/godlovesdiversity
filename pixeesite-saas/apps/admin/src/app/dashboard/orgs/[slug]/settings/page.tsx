import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { platformDb } from '@pixeesite/database';
import { SettingsClient } from '@/components/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const { slug } = await params;
  const userId = (session.user as any).id;
  const m = await platformDb.orgMember.findFirst({
    where: { userId, org: { slug } },
    select: { role: true, org: { select: { id: true, slug: true, name: true, primaryColor: true, font: true, logoUrl: true, defaultDomain: true, plan: true, planStatus: true, trialEndsAt: true, maxAiCredits: true, usedAiCredits: true } } },
  });
  if (!m) notFound();
  return <SettingsClient orgSlug={slug} role={m.role} org={JSON.parse(JSON.stringify(m.org))} />;
}
