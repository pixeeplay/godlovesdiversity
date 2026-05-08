import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BrainViz } from '@/components/admin/BrainViz';

export const dynamic = 'force-dynamic';
export const metadata = { title: '🧠 Cerveau RAG · GLD Admin' };

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return <BrainViz />;
}
