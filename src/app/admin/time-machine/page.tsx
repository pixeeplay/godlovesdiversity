import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TimeMachineClient } from '@/components/admin/TimeMachineClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Time Machine · Rollback · GLD Admin' };

export default async function TimeMachinePage() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') redirect('/admin');
  return <TimeMachineClient />;
}
