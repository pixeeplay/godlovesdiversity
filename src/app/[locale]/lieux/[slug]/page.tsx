import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { VenueProfile } from '@/components/VenueProfile';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const v = await prisma.venue.findUnique({ where: { slug }, select: { name: true, shortDescription: true, description: true, coverImage: true, city: true } });
    if (!v) return { title: 'Lieu introuvable · GLD' };
    const desc = v.shortDescription || v.description?.slice(0, 160) || `${v.name} — lieu LGBT-friendly à découvrir sur God Loves Diversity.`;
    return {
      title: `${v.name}${v.city ? ' · ' + v.city : ''} — GLD`,
      description: desc,
      openGraph: {
        title: v.name,
        description: desc,
        images: v.coverImage ? [v.coverImage] : undefined
      }
    };
  } catch {
    return { title: 'Lieu · GLD' };
  }
}

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let venue: any = null;
  try {
    venue = await prisma.venue.findUnique({
      where: { slug },
      include: {
        events: { where: { published: true, startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' } },
        coupons: { where: { active: true } }
      }
    });
    if (!venue) notFound();
    await prisma.venue.update({ where: { id: venue.id }, data: { views: { increment: 1 } } }).catch(() => null);
  } catch { notFound(); }

  return <VenueProfile venue={venue} />;
}
