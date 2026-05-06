import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { InvitationsClient } from '@/components/admin/InvitationsClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Invitations admin · GLD' };

export default async function InvitationsPage() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') redirect('/admin');
  return <InvitationsClient />;
}
