import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LeadsClient } from '@/components/admin/LeadsClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: '🎯 Leads CRM · GLD Admin' };

export default async function LeadsPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/leads');
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) redirect('/admin');
  return <LeadsClient />;
}
