import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EventsAdminClient } from '@/components/admin/EventsAdminClient';

export const dynamic = 'force-dynamic';

export default async function EventsAdminPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return <EventsAdminClient />;
}
