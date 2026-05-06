import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AiSettingsClient } from '@/components/admin/AiSettingsClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AI Settings · Multi-providers · GLD Admin' };

export default async function AiSettingsPage() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') redirect('/admin');
  return <AiSettingsClient />;
}
