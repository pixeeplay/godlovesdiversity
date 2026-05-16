import { setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';
import { GalleryClient } from '@/components/GalleryClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    <>
      {/* GLD V1 — Hero intro : visuel campagne principale */}
      <section className="relative overflow-hidden border-b border-[color:var(--border)]" style={{ background: 'var(--hero-bg, #0a0314)' }}>
        <div className="container-wide py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-brand-pink mb-5">Notre campagne</p>
            <h1 className="font-display font-black tracking-tight neon-title leading-[0.95]"
                style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
              La galerie mondiale
            </h1>
            <p className="mt-6 text-white/80 text-lg max-w-md leading-relaxed">
              Chaque photo est un témoignage. Chaque témoignage est un pas vers
              un monde plus accueillant.
            </p>
            <a
              href="/posters/gld-A3.pdf"
              download
              className="gld-cta-secondary mt-8"
            >
              Voir / télécharger l'affiche
            </a>
          </div>
          <div className="flex justify-center md:justify-end">
            <a href="/posters/gld-A3.pdf" target="_blank" rel="noreferrer" className="block">
              <div
                className="aspect-[210/297] w-[280px] md:w-[340px] rounded-lg overflow-hidden bg-black border border-white/10 shadow-[0_0_50px_rgba(255,43,177,.25)] flex items-center justify-center text-center p-8"
                style={{ background: 'linear-gradient(180deg, #FF2BB1 0%, #8B5CF6 50%, #22D3EE 100%)' }}
              >
                <div>
                  <p className="text-white/90 text-xs uppercase tracking-[0.4em] mb-3">Affiche officielle</p>
                  <p className="font-display font-black text-white text-3xl md:text-4xl leading-[0.9]">
                    GOD<br />LOVES<br />DIVERSITY
                  </p>
                  <p className="mt-6 text-white/85 text-[10px] uppercase tracking-widest">A3 · PDF</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-wide mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-wide text-white">
            Toutes les photos
          </h2>
          <p className="text-white/60 text-sm mt-2">Partagées par la communauté, partout dans le monde.</p>
        </div>
        <GalleryClient photos={items} />
      </section>
    </>
  );
}
