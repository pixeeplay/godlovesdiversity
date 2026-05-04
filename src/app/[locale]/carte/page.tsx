import { prisma } from '@/lib/prisma';
import { CountryMapClient } from '@/components/CountryMapClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Carte mondiale — God Loves Diversity' };

export default async function CountryMapPage() {
  let venues: any[] = [];
  let photos: any[] = [];
  try {
    venues = await prisma.venue.findMany({
      where: { published: true, lat: { not: null }, lng: { not: null } },
      select: { id: true, slug: true, name: true, type: true, rating: true, city: true, country: true, lat: true, lng: true, coverImage: true, shortDescription: true },
      take: 500
    });
    photos = await prisma.photo.findMany({
      where: { status: 'APPROVED' as any, latitude: { not: null }, longitude: { not: null } },
      select: { id: true, latitude: true, longitude: true, placeName: true, country: true, city: true, thumbnailKey: true },
      take: 500
    });
  } catch { /* migration */ }

  return <CountryMapClient venues={venues} photos={photos} />;
}
