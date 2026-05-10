import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LeadsScraperWizard } from '@/components/admin/LeadsScraperWizard';

export const dynamic = 'force-dynamic';
export const metadata = { title: '✨ Nouveau scrape · GLD Admin' };

export default async function NewScrapePage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/leads/scraper/new');
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) redirect('/admin');
  return <LeadsScraperWizard />;
}
