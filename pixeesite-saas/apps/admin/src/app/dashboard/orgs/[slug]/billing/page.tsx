import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { platformDb } from '@pixeesite/database';
import { BillingClient } from '@/components/BillingClient';

export const dynamic = 'force-dynamic';

export default async function BillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const { slug } = await params;
  const userId = (session.user as any).id;
  const m = await platformDb.orgMember.findFirst({
    where: { userId, org: { slug } },
    select: { role: true, org: { select: { id: true, plan: true, planStatus: true, trialEndsAt: true, maxAiCredits: true, usedAiCredits: true, subscription: true } } },
  });
  if (!m) notFound();
  const invoices = await platformDb.invoice.findMany({
    where: { orgId: m.org.id },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });
  return <BillingClient orgSlug={slug} role={m.role} org={JSON.parse(JSON.stringify(m.org))} invoices={JSON.parse(JSON.stringify(invoices))} />;
}
