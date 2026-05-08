import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ScraperWorkbench } from '@/components/admin/ScraperWorkbench';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Scraper RAG · GLD Admin' };

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return <ScraperWorkbench />;
}
