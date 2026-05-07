import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SecuritySettingsClient } from '@/components/admin/SecuritySettingsClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sécurité · Super-Admin · GLD' };

export default async function SecuritySettingsPage() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') redirect('/admin');
  return <SecuritySettingsClient />;
}
