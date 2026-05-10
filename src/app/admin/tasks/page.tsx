import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TasksBoardClient } from '@/components/admin/TasksBoardClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: '✅ Tasks board · GLD Admin' };

export default async function TasksPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/tasks');
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) redirect('/admin');
  return <TasksBoardClient />;
}
