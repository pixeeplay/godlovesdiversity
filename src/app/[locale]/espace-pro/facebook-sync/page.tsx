import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { FacebookSyncClient } from '@/components/FacebookSyncClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Synchro Facebook events — GLD' };

export default async function FacebookSyncPage() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login?next=/espace-pro/facebook-sync');

  const userId = (s.user as any).id;

  let venues: any[] = [];
  let user: any = null;
  try {
    venues = await prisma.venue.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, slug: true, city: true }
    });
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fbSessionCookies: true, fbLastSyncedAt: true }
    });
  } catch { /* migration */ }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gld.pixeeplay.com';

  return (
    <main className="container-wide py-12 max-w-5xl">
      <FacebookSyncClient
        venues={venues}
        userEmail={user?.email || ''}
        feedConfigured={!!user?.fbSessionCookies}
        lastSyncedAt={user?.fbLastSyncedAt || null}
        siteUrl={siteUrl}
      />
    </main>
  );
}
