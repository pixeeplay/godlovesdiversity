import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ManualsAdminClient } from './ManualsAdminClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Manuels — GLD Admin' };

export default async function P() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login');
  return <ManualsAdminClient />;
}
