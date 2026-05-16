import { setRequestLocale } from 'next-intl/server';
import { getAllSettings } from '@/lib/settings';
import { HeroFixed } from '@/components/home/HeroFixed';
import { AccrocheZone } from '@/components/home/AccrocheZone';
import { PartageLumiereSection } from '@/components/home/PartageLumiereSection';
import { GalerieMosaique } from '@/components/home/GalerieMosaique';
import { ActualitesMedias } from '@/components/home/ActualitesMedias';
import { PartnersBand } from '@/components/PartnersBand';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';

// SSR : on appelle Prisma à chaque requête (DATABASE_URL absent au build).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const s = await getAllSettings();
  const logoUrl = s['site.logoUrl'];
  const localePrefix = locale !== 'fr' ? `/${locale}` : '';

  // ─── Photos approuvées (max 12 pour Zone 2, 8 pour Zone 3) ──────────
  const recentPhotos = await prisma.photo.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    take: 20
  }).catch(() => []);
  const photoItems = recentPhotos.map((p) => ({
    id: p.id,
    url: publicUrl(p.storageKey),
    caption: p.caption,
    author: p.authorName,
    placeName: p.placeName,
    city: p.city,
    country: p.country
  }));

  // ─── Vidéos YouTube publiées (on prend la 1ère pour Zone 4) ─────────
  const videos = await prisma.youtubeVideo.findMany({
    where: { published: true },
    orderBy: { order: 'asc' },
    take: 6
  }).catch(() => []);

  // ─── Articles récents (max 4 pour Zone 4) ───────────────────────────
  const recentArticles = await prisma.article.findMany({
    where: { published: true, locale },
    orderBy: { publishedAt: 'desc' },
    take: 8
  }).catch(() => []);
  const articleItems = recentArticles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    coverImage: a.coverImage,
    publishedAt: a.publishedAt?.toISOString() || null
  }));

  // ─── Bannière active pour le Hero (on garde le MESSAGE actuel) ──────
  // Le brief demande de conserver le message actuel : on reprend la 1ère bannière
  // publiée et active. Sinon fallback hardcodé identique à l'ancien.
  const now = new Date();
  const allBanners = await prisma.banner.findMany({
    where: { locale, published: true },
    orderBy: { order: 'asc' }
  }).catch(() => []);

  let activeThemeSlug: string | null = null;
  try {
    const theme = await prisma.theme.findFirst({ where: { active: true }, select: { slug: true } });
    if (theme) activeThemeSlug = theme.slug;
  } catch {}

  function isBannerActive(b: any): boolean {
    if (b.linkedThemeSlug) return activeThemeSlug === b.linkedThemeSlug;
    if (b.activeFrom && now < new Date(b.activeFrom)) return false;
    if (b.activeUntil && now > new Date(b.activeUntil)) return false;
    return true;
  }

  let banners = allBanners.filter(isBannerActive);
  if (banners.length === 0 && locale !== 'fr') {
    const altAll = await prisma.banner.findMany({
      where: { locale: 'fr', published: true },
      orderBy: { order: 'asc' }
    }).catch(() => []);
    banners = altAll.filter(isBannerActive);
  }
  const hero = banners[0] || {
    eyebrow: 'Mouvement interreligieux • 2026',
    title: 'GOD LOVES DIVERSITY',
    subtitle: "Dieu n'est pas opposé aux personnes LGBT. L'amour, la justice et la compassion sont au cœur des grandes religions monothéistes.",
    accentColor: '#FF2BB1',
    cta1Text: 'COMPRENDRE LE MESSAGE',
    cta1Url: `${localePrefix}/le-message`,
    cta2Text: 'VOIR LES PHOTOS',
    cta2Url: `${localePrefix}/galerie`,
    mediaUrl: null,
    mediaType: null
  };

  return (
    <>
      {/* ═══ HERO FIXE (anti carrousel) ═══ */}
      <HeroFixed
        eyebrow={hero.eyebrow}
        title={hero.title}
        subtitle={hero.subtitle}
        ctaText={hero.cta1Text}
        ctaUrl={hero.cta1Url}
        ctaSecondaryText={hero.cta2Text}
        ctaSecondaryUrl={hero.cta2Url}
        accentColor={hero.accentColor}
        logoUrl={logoUrl || null}
        mediaUrl={hero.mediaUrl}
        mediaType={hero.mediaType}
      />

      {/* ═══ ZONE 1 — Accroche typo "L'amour est universel." ═══ */}
      <AccrocheZone />

      {/* ═══ ZONE 2 — Partage ta lumière (texte + 12 photos + 2 CTAs) ═══ */}
      <PartageLumiereSection
        photos={photoItems}
        participateHref={`${localePrefix}/participer`}
        posterHref="/posters/gld-A3.pdf"
      />

      {/* ═══ ZONE 3 — Galerie mosaïque 8 photos + CTA communauté ═══ */}
      <GalerieMosaique
        photos={photoItems}
        galerieHref={`${localePrefix}/galerie`}
      />

      {/* ═══ ZONE 4 — Actualités / Médias modulaire ═══ */}
      <ActualitesMedias
        articles={articleItems}
        videos={videos}
        locale={locale}
      />

      {/* ═══ PARTENAIRES — logos N&B (composant existant) ═══ */}
      <PartnersBand />
    </>
  );
}
