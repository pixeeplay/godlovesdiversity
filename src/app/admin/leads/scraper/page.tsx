import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LeadsScraperDashboard } from '@/components/admin/LeadsScraperDashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: '🕷 Scraper Leads · GLD Admin' };

export default async function LeadsScraperPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/leads/scraper');
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) redirect('/admin');
  return <LeadsScraperDashboard />;
}
