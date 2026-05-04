import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProAIStudio } from '@/components/admin/ProAIStudio';

export const dynamic = 'force-dynamic';

export default async function ProAIStudioPage() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login?next=/admin/pro/ai-studio');
  const userId = (s.user as any).id;
  const isAdmin = (s.user as any).role === 'ADMIN';

  let venues: any[] = [];
  try {
    venues = await prisma.venue.findMany({
      where: isAdmin ? {} : { ownerId: userId },
      select: { id: true, name: true, type: true, city: true, description: true, tags: true }
    });
  } catch { /* migration */ }

  return <ProAIStudio venues={venues} />;
}
