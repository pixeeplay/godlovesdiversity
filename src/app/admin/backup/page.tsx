import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BackupAdmin } from '@/components/admin/BackupAdmin';

export const dynamic = 'force-dynamic';

export default async function BackupPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return <BackupAdmin />;
}
