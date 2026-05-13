/**
 * /region/[slug] — Page région SEO-rich (unique content per region).
 * Contenu éditorial unique + top lieux + histoire LGBT régionale + JSON-LD.
 * Boost SEO important : 13+ pages indexées avec contenu original pour lgbtfrance.fr.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { unstable_setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { getRegionSEO, listRegionsSEO } from '@/lib/region-seo';
import type { Metadata } from 'next';

type Params = { locale: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const seo = getRegionSEO(slug);
  if (!seo) return { title: 'Région introuvable' };
  return {
    title: `LGBT ${seo.name} — Annuaire des bars, clubs, saunas et associations | LGBT France`,
    description: seo.intro.slice(0, 158),
    alternates: { canonical: `/${locale}/region/${slug}` },
    keywords: seo.keywords.join(', ')
  };
}

export default async function RegionPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  unstable_setRequestLocale(locale);

  const seo = getRegionSEO(slug);
  if (!seo) notFound();

  const region = await prisma.region.findUnique({
    where: { slug },
    include: {
      listings: {
        where: { status: 'PUBLISHED' },
        include: { categories: { include: { category: true } } },
        take: 50,
        orderBy: { name: 'asc' }
      }
    }
  });

  const listings = region?.listings ?? [];
  const totalCount = listings.length;

  // Stats par catégorie
  const byCategory = new Map<string, number>();
  for (const l of listings) {
    for (const c of l.categories) {
      byCategory.set(c.category.name_fr, (byCategory.get(c.category.name_fr) || 0) + 1);
    }
  }

  // JSON-LD CollectionPage (SEO)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `LGBT ${seo.name}`,
    description: seo.intro,
    about: { '@type': 'Place', name: seo.name },
    keywords: seo.keywords.join(', '),
    hasPart: listings.slice(0, 20).map(l => ({
      '@type': 'LocalBusiness',
      name: l.name,
      address: l.street ? {
        '@type': 'PostalAddress',
        streetAddress: l.street,
        postalCode: l.postal_code,
        addressLocality: l.city
      } : undefined
    }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <header className="mb-12">
          <div className="text-xs uppercase tracking-widest opacity-60 mb-3">Région · France</div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4">
            LGBT <span className="text-pink-500">{seo.name}</span>
          </h1>
          <div className="flex flex-wrap gap-4 text-sm opacity-80">
            <span>📍 {seo.topCities.length} villes phares</span>
            <span>🏳️‍🌈 {totalCount} lieux LGBT-friendly recensés</span>
            {seo.pridePrincipale && <span>🎉 {seo.pridePrincipale}</span>}
          </div>
        </header>

        {/* Intro éditoriale (contenu unique SEO) */}
        <section className="prose dark:prose-invert max-w-none mb-12">
          <h2 className="text-2xl font-bold">Présentation de la région</h2>
          <p className="text-lg leading-relaxed">{seo.intro}</p>
        </section>

        {/* Top villes */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Top villes LGBT en {seo.name}</h2>
          <div className="flex flex-wrap gap-3">
            {seo.topCities.map(city => (
              <span key={city} className="px-4 py-2 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 font-semibold">
                {city}
              </span>
            ))}
          </div>
        </section>

        {/* Stats par catégorie */}
        {byCategory.size > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Que trouver en {seo.name} ?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
                <div key={cat} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                  <div className="text-2xl font-black">{n}</div>
                  <div className="text-sm opacity-70">{cat}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Histoire LGBT régionale (contenu unique) */}
        <section className="mb-12 bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-4">Histoire LGBT en {seo.name}</h2>
          <p className="leading-relaxed">{seo.history}</p>
        </section>

        {/* Liste des lieux */}
        {listings.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Tous les lieux LGBT en {seo.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map(l => (
                <Link
                  key={l.id}
                  href={`/${locale}/listing/${l.slug}`}
                  className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:shadow-lg transition group"
                >
                  {l.cover_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.cover_image} alt={l.name} className="w-full h-40 object-cover group-hover:scale-105 transition" />
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-bold mb-1">{l.name}</h3>
                    {l.subtitle_fr && <p className="text-sm opacity-70 line-clamp-2">{l.subtitle_fr}</p>}
                    <p className="text-xs opacity-50 mt-2">{l.city} {l.postal_code}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Footer SEO — internal linking */}
        <footer className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <h3 className="text-xl font-bold mb-4">Explorez d'autres régions LGBT en France</h3>
          <div className="flex flex-wrap gap-2">
            {listRegionsSEO().filter(r => r.slug !== slug).map(r => (
              <Link
                key={r.slug}
                href={`/${locale}/region/${r.slug}`}
                className="text-sm px-3 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition"
              >
                {r.name}
              </Link>
            ))}
          </div>
        </footer>
      </main>
    </>
  );
}

export async function generateStaticParams() {
  return listRegionsSEO().map(r => ({ slug: r.slug }));
}
