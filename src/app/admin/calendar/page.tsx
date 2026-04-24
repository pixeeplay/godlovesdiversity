import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SocialCalendar } from '@/components/admin/SocialCalendar';

export default async function CalendarPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const posts = await prisma.scheduledPost.findMany({
    orderBy: { scheduledAt: 'asc' },
    take: 200
  });
  return (
    <div className="p-8">
      <h1 className="text-3xl font-display font-bold mb-2">Calendrier social</h1>
      <p className="text-zinc-400 mb-6">Programmez des publications cross-réseaux : Instagram, Facebook, X, LinkedIn, TikTok.</p>
      <SocialCalendar
        initialPosts={posts.map((p) => ({ ...p, scheduledAt: p.scheduledAt.toISOString() }))}
      />
    </div>
  );
}
