import { Link } from '@/i18n/routing';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ArrowRight, Image as ImageIcon, Download, MessageSquare, Heart } from 'lucide-react';
import { getAllSettings } from '@/lib/settings';
import { NeonHeart } from '@/components/NeonHeart';
import { SacredSkyline } from '@/components/SacredSkyline';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { NewsCarousel } from '@/components/NewsCarousel';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const s = await getAllSettings();

  const v = (key: string, fallback: string) => s[`home.${key}`] || fallback;
  const eyebrow = s['home.hero.eyebrow'] || 'Mouvement interreligieux • 2026';
  const titleA = s['home.hero.titleA'] || 'GOD';
  const titleB = s['home.hero.titleB'] || 'LOVES DIVERSITY';
  const subtitle = v('hero.subtitle', t('subtitle'));
  const ctaPrimary = v('hero.ctaPrimary', t('cta_participate'));
  const ctaSecondary = v('hero.ctaSecondary', t('cta_understand'));
  const manifestoTitle = v('manifesto.title', t('manifesto_title'));
  const manifestoText = v('manifesto.text', t('manifesto_text'));
  const pillarsTitle = v('pillars.title', t('pillars_title'));
  const ctaTitle = v('cta.title', t('join_title'));
  const ctaText = v('cta.text', t('join_text'));
  const logoUrl = s['site.logoUrl'];
  const hashtag = s['campaign.hashtag'] || '#GodLovesDiversity';

  const pillars = [1, 2, 3, 4].map((i) => ({
    n: i,
    title: v(`pillar${i}.title`, t(`pillar${i}_title` as any)),
    text: v(`pillar${i}.text`, t(`pillar${i}_text` as any))
  }));

  // Données pour les carrousels
  const recentPhotos = await prisma.photo.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    take: 12
  });
  const photoItems = recentPhotos.map((p) => ({
    id: p.id,
    url: publicUrl(p.storageKey),
    isDemo: p.storageKey?.startsWith('demo/') || false,
    caption: p.caption,
    placeName: p.placeName,
    placeType: p.placeType,
    city: p.city,
    country: p.country,
    author: p.authorName
  }));

  const recentArticles = await prisma.article.findMany({
    where: { published: true, locale },
    orderBy: { publishedAt: 'desc' },
    take: 8
  });
  const articleItems = recentArticles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    coverImage: a.coverImage,
    coverVideo: a.coverVideo,
    publishedAt: a.publishedAt?.toISOString() || null,
    tags: a.tags
  }));

  return (
    <>
      {/* HERO — 2 colonnes + skyline défilante en bas */}
      <section className="relative min-h-[88vh] flex flex-col">
        <div className="container-wide flex-1 flex items-center pt-12 pb-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
            {/* Cœur néon — gauche */}
            <div className="flex justify-center lg:justify-start">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="max-h-80 object-contain" />
              ) : (
                <NeonHeart size={340} />
              )}
            </div>

            {/* Texte — droite */}
            <div className="text-center lg:text-left">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60 mb-5">{eyebrow}</p>
              <h1 className="font-display font-black leading-[0.9] tracking-tight">
                <span className="block text-7xl md:text-8xl lg:text-[8rem] text-brand-pink neon-title">
                  {titleA}
                </span>
                <span className="block text-5xl md:text-6xl lg:text-7xl text-white mt-1">
                  {titleB}
                </span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-white/80 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
                {subtitle}
              </p>
              <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
                <Link href="/participer" className="btn-primary">
                  {ctaPrimary} <ArrowRight size={18} />
                </Link>
                <Link href="/argumentaire" className="btn-ghost">
                  {ctaSecondary}
                </Link>
                <Link href="/galerie" className="btn-ghost">
                  <ImageIcon size={18} /> {t('cta_gallery')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Skyline défilante en bas du hero */}
        <div className="relative">
          <SacredSkyline height={220} />
        </div>
      </section>

      <div className="container-wide"><div className="gothic-divider" /></div>

      {/* CARROUSEL PHOTOS */}
      <PhotoCarousel photos={photoItems} title="Galerie" />

      <div className="container-wide"><div className="gothic-divider" /></div>

      {/* MANIFESTE */}
      <section className="container-tight py-24 relative">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-pink mb-4">Manifeste</p>
        <h2 className="font-display text-4xl md:text-6xl font-bold mb-8 neon-title">
          {manifestoTitle}
        </h2>
        <p className="text-2xl text-white/80 leading-relaxed font-light max-w-3xl">
          {manifestoText}
        </p>
      </section>

      <div className="container-wide"><div className="gothic-divider" /></div>

      {/* PILIERS */}
      <section className="container-wide py-24">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.3em] text-white/50 mb-4">Argumentaire</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold neon-title">
            {pillarsTitle}
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {pillars.map((p) => (
            <article key={p.n} className="stained-card p-8 group transition-all duration-500">
              <div className="flex items-start gap-6">
                <div className="pillar-num text-7xl font-display group-hover:scale-110 transition-transform">
                  {String(p.n).padStart(2, '0')}
                </div>
                <div>
                  <h3 className="font-bold text-2xl mb-3 text-white">{p.title}</h3>
                  <p className="text-white/70 leading-relaxed">{p.text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="container-wide"><div className="gothic-divider" /></div>

      {/* CARROUSEL ACTUS / VIDÉOS */}
      <NewsCarousel articles={articleItems} />

      <div className="container-wide"><div className="gothic-divider" /></div>

      {/* CTA FINAL — avec skyline en bas */}
      <section className="relative py-24 text-center">
        <div className="container-tight relative z-10">
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-6 neon-title">
            {ctaTitle}
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            {ctaText}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/affiches" className="btn-primary">
              <Download size={18} /> Télécharger l'affiche
            </Link>
            <Link href="/participer" className="btn-ghost">
              <MessageSquare size={18} /> {t('cta_participate')}
            </Link>
          </div>
          <p className="mt-12 font-mono text-sm text-white/40">{hashtag}</p>
        </div>
      </section>
    </>
  );
}
