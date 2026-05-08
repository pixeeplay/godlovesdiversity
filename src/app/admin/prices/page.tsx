import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PriceWatchList } from '@/components/admin/PriceWatchList';

export const dynamic = 'force-dynamic';
export const metadata = { title: '💰 Comparateur Prix · GLD Admin' };

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return <PriceWatchList />;
}
