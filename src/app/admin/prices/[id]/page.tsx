import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PriceWatchDetail } from '@/components/admin/PriceWatchDetail';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return <PriceWatchDetail watchId={params.id} />;
}
