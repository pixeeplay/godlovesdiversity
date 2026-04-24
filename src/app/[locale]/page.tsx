import { Link } from '@/i18n/routing';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Heart, BookOpen, Handshake, Users, Download } from 'lucide-react';
import { getAllSettings } from '@/lib/settings';
import { HeroBannerCarousel } from '@/components/HeroBannerCarousel';
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
  const titleA = s['home.hero.titleA'] || 'GOD';
  const titleB = s['home.hero.titleB'] || 'LOVES DIVERSITY';
  const subtitle = v('hero.subtitle',
    "Dieu n'est pas opposé aux personnes LGBT. L'amour, la justice et la compassion sont au cœur des grandes religions monothéistes."
  );
  const ctaPrimary = v('hero.ctaPrimary', 'Comprendre le message');
  const ctaSecondary = v('hero.ctaSecondary', 'Voir les photos');
  const pillarsTitle = v('pillars.title', 'L\'AMOUR EST UNIVERSEL');
  const postersTitle = v('posters.title', 'TÉLÉCHARGEZ L\'AFFICHE');
  const postersText = v('posters.text', 'Imprimez, affichez, prenez une photo et soyez acteur du changement !');
  const logoUrl = s['site.logoUrl'];
  const hashtag = s['campaign.hashtag'] || '#GodLovesDiversity';

  const pillars = [
    {
      icon: Heart,
      color: '#FF2BB1',
      title: v('pillar1.title', 'DIEU EST AMOUR'),
      text: v('pillar1.text', 'Au cœur des trois grandes religions monothéistes, Dieu est amour, miséricorde et compassion.')
    },
    {
      icon: BookOpen,
      color: '#FBBF24',
      title: v('pillar2.title', 'LES TEXTES SONT CONTEXTUALISÉS'),
      text: v('pillar2.text', 'Les passages souvent cités doivent être compris dans leur contexte historique, culturel et social.')
    },
    {
      icon: Handshake,
      color: '#34D399',
      title: v('pillar3.title', 'L\'INTERPRÉTATION EST HUMAINE'),
      text: v('pillar3.text', 'Les traductions et interprétations ont été influencées par des normes culturelles pas toujours en accord avec l\'amour universel.')
    },
    {
      icon: Users,
      color: '#8B5CF6',
      title: v('pillar4.title', 'FOI ET DIVERSITÉ SONT COMPATIBLES'),
      text: v('pillar4.text', 'De nombreuses communautés religieuses inclusives existent et accueillent les personnes LGBT+.')
    }
  ];

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
    id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt,
    coverImage: a.coverImage, coverVideo: a.coverVideo,
    publishedAt: a.publishedAt?.toISOString() || null, tags: a.tags
  }));

  // Récupère bannières dynamiques (FR par défaut, fallback hardcodé)
  let banners = await prisma.banner.findMany({
    where: { locale, published: true },
    orderBy: { order: 'asc' }
  });
  if (banners.length === 0 && locale !== 'fr') {
    banners = await prisma.banner.findMany({
      where: { locale: 'fr', published: true },
      orderBy: { order: 'asc' }
    });
  }
  if (banners.length === 0) {
    banners = [{
      id: 'default', order: 1, locale, published: true,
      eyebrow: 'Mouvement interreligieux • 2026',
      title: 'GOD LOVES DIVERSITY',
      subtitle, accentColor: '#FF2BB1',
      cta1Text: 'COMPRENDRE LE MESSAGE', cta1Url: '/argumentaire',
      cta2Text: 'VOIR LES PHOTOS', cta2Url: '/galerie',
      mediaUrl: null, mediaType: null,
      createdAt: new Date(), updatedAt: new Date()
    } as any];
  }

  return (
    <>
      {/* ═══ HERO BANNER CAROUSEL ═══ */}
      <HeroBannerCarousel banners={banners} logoUrl={logoUrl || null} />

      {/* ═══ PILIERS « L'AMOUR EST UNIVERSEL » ═══ */}
      <section className="py-20" style={{ background: 'var(--bg)' }}>
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl font-black tracking-wide">{pillarsTitle}</h2>
            <div className="mx-auto mt-3 h-1 w-16 bg-brand-pink rounded-full" />
          </div>

          <div className="grid md:grid-cols-4 gap-0 max-w-6xl mx-auto">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <div
                  key={i}
                  className={`px-6 py-4 text-center ${i < 3 ? 'md:border-r md:border-white/10' : ''}`}
                >
                  <div className="flex justify-center mb-5">
                    <Icon size={56} strokeWidth={1.5} style={{ color: p.color }} />
                  </div>
                  <h3 className="font-display font-bold text-sm tracking-widest mb-3">{p.title}</h3>
                  <div className="mx-auto h-px w-10 bg-white/20 mb-3" />
                  <p className="text-sm text-white/70 leading-relaxed">{p.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ TÉLÉCHARGEZ L'AFFICHE ═══ */}
      <PostersShowcase title={postersTitle} text={postersText} />

      {/* ═══ CARROUSELS DYNAMIQUES (gardés) ═══ */}
      <PhotoCarousel photos={photoItems} title="Galerie" />
      {articleItems.length > 0 && <NewsCarousel articles={articleItems} />}
    </>
  );
}

/* ─── Section affiches ─── */
function PostersShowcase({ title, text }: { title: string; text: string }) {
  return (
    <section className="py-20" style={{ background: '#0a0314' }}>
      <div className="container-wide grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="font-display text-3xl md:text-5xl font-black tracking-wide">{title}</h2>
          <div className="mt-3 h-1 w-16 bg-brand-pink rounded-full" />
          <p className="mt-6 text-white/75 max-w-md leading-relaxed">{text}</p>
          <Link
            href="/affiches"
            className="mt-8 inline-flex items-center gap-2 bg-brand-pink hover:bg-brand-rose text-white font-bold uppercase text-xs tracking-widest px-6 py-3 rounded-full transition shadow-[0_0_30px_rgba(255,43,177,.4)]"
          >
            <Download size={14} /> Télécharger
          </Link>
        </div>
        {/* Mockups */}
        <div className="flex items-end justify-center gap-4">
          <PosterMockup label="A3" w={140} h={196} />
          <PosterMockup label="A4" w={110} h={155} />
          <PosterMockup label="STORIES" w={70} h={140} />
        </div>
      </div>
    </section>
  );
}

function PosterMockup({ label, w, h }: { label: string; w: number; h: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-lg flex flex-col items-center justify-center bg-black border border-white/10 shadow-[0_0_30px_rgba(255,43,177,.2)] relative overflow-hidden"
        style={{ width: w, height: h }}
      >
        <div className="text-brand-pink font-display font-black tracking-wider" style={{ fontSize: w * 0.18 }}>
          GOD
        </div>
        <div style={{ width: w * 0.5, height: w * 0.5 }} className="my-2">
          <NeonHeart size={w * 0.5} />
        </div>
        <div className="text-brand-pink font-display font-black tracking-wider" style={{ fontSize: w * 0.13 }}>
          DIVERSITY
        </div>
        {/* QR code stylisé */}
        <div className="absolute bottom-2 right-2 w-6 h-6 bg-white rounded-sm grid grid-cols-3 gap-px p-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={`${[0, 2, 4, 6, 8].includes(i) ? 'bg-black' : ''} rounded-[1px]`} />
          ))}
        </div>
      </div>
      <span className="text-xs text-white/50 font-mono">{label}</span>
    </div>
  );
}

