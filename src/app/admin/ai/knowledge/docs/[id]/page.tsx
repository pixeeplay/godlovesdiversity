import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DocViewer } from '@/components/admin/DocViewer';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return <DocViewer docId={params.id} />;
}
