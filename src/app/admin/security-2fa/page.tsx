import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Mfa2faClient } from '@/components/admin/Mfa2faClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: '2FA · Sécurité · GLD' };

export default async function Mfa2faPage() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login');
  return <Mfa2faClient userEmail={s.user.email || ''} />;
}
