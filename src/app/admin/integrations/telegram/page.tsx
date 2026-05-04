import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TelegramDashboard } from '@/components/admin/TelegramDashboard';

export const dynamic = 'force-dynamic';

export default async function TelegramAdminPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return <TelegramDashboard />;
}
