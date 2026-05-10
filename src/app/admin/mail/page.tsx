import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { WebmailClient } from '@/components/admin/WebmailClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: '✉️ Webmail · GLD Admin' };

export default async function MailPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/mail');
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) redirect('/admin');
  return <WebmailClient />;
}
