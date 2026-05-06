import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewsletterPlanClient } from './NewsletterPlanClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plan Newsletter Annuel — GLD Admin' };

export default async function P() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login');
  if ((s.user as any).role !== 'ADMIN') redirect('/admin');
  return <NewsletterPlanClient />;
}
