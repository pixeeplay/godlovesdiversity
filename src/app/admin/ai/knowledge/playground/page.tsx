import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Playground } from '@/components/admin/Playground';

export const dynamic = 'force-dynamic';
export const metadata = { title: '💬 Playground RAG · GLD Admin' };

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return <Playground />;
}
