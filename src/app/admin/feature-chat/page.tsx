import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FeatureChatClient } from '@/components/admin/FeatureChatClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Feature Chat IA · GLD Admin' };

export default async function FeatureChatPage() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') redirect('/admin');
  return <FeatureChatClient />;
}
