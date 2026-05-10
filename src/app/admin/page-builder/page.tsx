import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PageBuilderHome } from '@/components/admin/PageBuilderHome';

export const dynamic = 'force-dynamic';
export const metadata = { title: '🎨 Page Builder · GLD Admin' };

export default async function PageBuilderHomePage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/page-builder');
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) redirect('/admin');
  return <PageBuilderHome />;
}
