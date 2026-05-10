import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardShell } from '@/components/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?callbackUrl=/dashboard');
  const orgs = ((session.user as any).orgs || []) as Array<{ slug: string; name: string; plan: string; role: string }>;
  return <DashboardShell user={session.user} orgs={orgs}>{children}</DashboardShell>;
}
