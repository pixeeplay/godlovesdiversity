import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SecretsManagerClient } from '@/components/admin/SecretsManagerClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: '🔐 Secrets manager · GLD Admin' };

export default async function SecretsPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/secrets');
  if ((s.user as any)?.role !== 'ADMIN') redirect('/admin');
  return <SecretsManagerClient />;
}
