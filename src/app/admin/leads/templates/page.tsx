import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LeadsTemplatesClient } from '@/components/admin/LeadsTemplatesClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: '📧 Templates emails · GLD Admin' };

export default async function TemplatesPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/leads/templates');
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) redirect('/admin');
  return <LeadsTemplatesClient />;
}
