import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TariffsAdmin } from '@/components/admin/TariffsAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: '📥 Ingestion Tarifs · GLD Admin' };

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return <TariffsAdmin />;
}
