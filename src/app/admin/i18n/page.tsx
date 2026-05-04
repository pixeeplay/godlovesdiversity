import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { I18nAuditClient } from '@/components/admin/I18nAuditClient';

export const dynamic = 'force-dynamic';

export default async function I18nAuditPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return <I18nAuditClient />;
}
