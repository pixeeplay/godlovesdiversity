import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PageBuilderEditor } from '@/components/admin/PageBuilderEditor';

export const dynamic = 'force-dynamic';

export default async function PageBuilderEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) redirect('/admin');
  const { slug } = await params;
  return <PageBuilderEditor slug={slug} />;
}
