import { prisma } from '@/lib/prisma';
import { RapportClient } from '@/components/RapportClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Rapport GLD — État du projet & roadmap',
  description: 'Tableau de bord public : fonctionnalités, sécurité, prochaines évolutions'
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

async function loadStats() {
  return {
    users:            await safe(() => prisma.user.count(), 0),
    venues:           await safe(() => prisma.venue.count(), 0),
    posts:            await safe(() => prisma.forumPost.count(), 0),
    photos:           await safe(() => prisma.photo.count(), 0),
    testimonies:      await safe(() => prisma.videoTestimony.count(), 0),
    products:         await safe(() => prisma.product.count(), 0),
    orders:           await safe(() => prisma.order.count(), 0),
    donations:        0, // pas de model Donation pour l'instant
    events:           await safe(() => prisma.event.count(), 0),
    connectProfiles:  await safe(() => (prisma as any).connectProfile?.count?.() ?? 0, 0),
    connectMatches:   await safe(() => (prisma as any).connectMatch?.count?.() ?? 0, 0),
    connectMessages:  await safe(() => (prisma as any).connectMessage?.count?.() ?? 0, 0)
  };
}

export default async function P() {
  const stats = await loadStats();
  return <RapportClient stats={stats} />;
}
