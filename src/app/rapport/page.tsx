import { prisma } from '@/lib/prisma';
import { RapportClient } from '@/components/RapportClient';

export const dynamic = 'force-dynamic';
export const revalidate = 300;
export const metadata = {
  title: 'Rapport GLD — État du projet & roadmap',
  description: 'Tableau de bord public : fonctionnalités, sécurité, prochaines évolutions',
  openGraph: {
    title: 'GLD — Rapport projet',
    description: 'Le réseau social inclusif religieux — state of the art',
    images: ['/og-rapport.png']
  }
};

async function loadStats() {
  const [users, venues, posts, photos, testimonies, products, orders, donations, events, connectProfiles, connectMatches, connectMessages] = await Promise.all([
    prisma.user.count().catch(() => 0),
    prisma.venue.count().catch(() => 0),
    prisma.forumPost.count().catch(() => 0),
    prisma.photo.count().catch(() => 0),
    prisma.videoTestimony.count().catch(() => 0),
    prisma.product.count().catch(() => 0),
    prisma.order.count().catch(() => 0),
    prisma.donation?.count?.().catch(() => 0) ?? 0,
    prisma.event.count().catch(() => 0),
    prisma.connectProfile.count().catch(() => 0),
    prisma.connectMatch.count().catch(() => 0),
    prisma.connectMessage.count().catch(() => 0)
  ]);
  return { users, venues, posts, photos, testimonies, products, orders, donations, events, connectProfiles, connectMatches, connectMessages };
}

export default async function P() {
  const stats = await loadStats();
  return <RapportClient stats={stats} />;
}
