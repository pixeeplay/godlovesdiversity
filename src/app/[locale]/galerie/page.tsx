import { setRequestLocale, getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';
import { GalleryClient } from '@/components/GalleryClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('gallery');

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
    <section className="container-wide py-12">
      <div className="text-center mb-10">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-pink mb-3">{t('title')}</p>
        <h1 className="font-display text-4xl md:text-6xl font-bold neon-title mb-4">
          {t('title')}
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto">{t('subtitle')}</p>
      </div>
      <GalleryClient photos={items} />
    </section>
  );
}
