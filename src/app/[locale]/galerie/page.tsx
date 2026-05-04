import { setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';
import { GalleryClient } from '@/components/GalleryClient';

export const revalidate = 60; // ISR — cache 1 min

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const photos = await prisma.photo.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    take: 500
  });

  const items = photos.map((p) => ({
    id: p.id,
    url: publicUrl(p.storageKey),
    isDemo: p.storageKey?.startsWith('demo/') || false,
    caption: p.caption,
    placeName: p.placeName,
    placeType: p.placeType,
    city: p.city,
    country: p.country,
    latitude: p.latitude,
    longitude: p.longitude,
    author: p.authorName
  }));

  return (
    <section className="py-12">
      <div className="container-wide mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-black tracking-wide text-white">
          GALERIE MONDIALE
        </h1>
        <p className="text-white/60 text-sm mt-2">Découvrez les photos partagées par la communauté</p>
      </div>
      <GalleryClient photos={items} />
    </section>
  );
}
