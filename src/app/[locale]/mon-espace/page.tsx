import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAllFeatureFlags } from '@/lib/feature-flags';
import { MonEspaceDashboard } from '@/components/MonEspaceDashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mon espace — GLD' };

export default async function P() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login?next=/mon-espace');
  const userId = (s.user as any).id;
  if (['ADMIN', 'EDITOR'].includes((s.user as any).role)) redirect('/admin');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, image: true, createdAt: true,
      bio: true, publicName: true, identity: true, traditions: true, cityProfile: true,
      bannerUrl: true, dashboardTheme: true, favoriteColor: true
    }
  });

  // Stats avec gestion d'erreur best-effort
  let stats = { posts: 0, threads: 0, photos: 0, testimonies: 0, reviews: 0, journal: 0, letters: 0, bookmarks: 0 };
  try {
    [stats.posts, stats.threads, stats.photos, stats.testimonies, stats.reviews, stats.journal, stats.letters, stats.bookmarks] = await Promise.all([
      prisma.forumPost.count({ where: { authorId: userId } }).catch(() => 0),
      prisma.forumThread.count({ where: { authorId: userId } }).catch(() => 0),
      prisma.photo.count({ where: { uploaderId: userId } }).catch(() => 0),
      prisma.videoTestimony.count({ where: { uploaderId: userId } }).catch(() => 0),
      prisma.productReview.count({ where: { authorId: userId } }).catch(() => 0),
      prisma.journalEntry.count({ where: { userId } }).catch(() => 0),
      prisma.futureLetter.count({ where: { userId } }).catch(() => 0),
      prisma.bookmark.count({ where: { userId } }).catch(() => 0)
    ]);
  } catch {}

  // Distribution des moods récents (pour le mood ring)
  let moodCounts: Record<string, number> = {};
  try {
    const recent = await prisma.journalEntry.findMany({ where: { userId, mood: { not: null } }, take: 50, orderBy: { createdAt: 'desc' } });
    for (const e of recent) if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
  } catch {}

  // Activité 30 derniers jours pour la heatmap
  let activityDays: number[] = new Array(30).fill(0);
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const acts = await prisma.userActivityLog.findMany({ where: { userId, createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } });
    for (const a of acts) {
      const dayIdx = Math.floor((Date.now() - a.createdAt.getTime()) / 86400000);
      if (dayIdx < 30) activityDays[29 - dayIdx]++;
    }
  } catch {}

  const flags = await getAllFeatureFlags();

  return <MonEspaceDashboard user={user} stats={stats} flags={flags} moodCounts={moodCounts} activityDays={activityDays} />;
}
