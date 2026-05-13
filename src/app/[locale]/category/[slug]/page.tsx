/**
 * /category/[slug] — Page catégorie (compat URL WordPress parislgbt.com)
 * Liste tous les Listings rattachés à cette catégorie, filtrés par scope (site).
 * SEO : title + description i18n + JSON-LD CollectionPage.
 * Filtres : sidebar avec ville, CP, tag, "ouvert maintenant".
 */
import { notFound } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { getScope } from '@/lib/scope';
import type { Metadata } from 'next';
import { CategoryClient } from './CategoryClient';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

type Params = { locale: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (!cat) return { title: 'Catégorie introuvable' };
  const title = locale === 'en' ? (cat.name_en ?? cat.name_fr) : cat.name_fr;
  const description = locale === 'en' ? (cat.meta_description_en ?? cat.description_en ?? '') : (cat.meta_description_fr ?? cat.description_fr ?? '');
  return {
    title: `${title} — parislgbt`,
    description: description || `Découvrez tous les lieux LGBT-friendly de la catégorie ${title} à Paris et en France.`,
    alternates: { canonical: `/${locale}/category/${slug}` }
  };
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  unstable_setRequestLocale(locale);
  const scope = getScope();

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      listings: {
        include: {
          listing: {
            include: { categories: { include: { category: true } }, tags: { include: { tag: true } } }
          }
        }
      }
    }
  });

  if (!category) notFound();

  const allListings = category.listings.map((c) => c.listing).filter((l) => l.status === 'PUBLISHED');
  const visibleListings = scope === 'paris'
    ? allListings.filter((l) => (l.city?.toLowerCase() === 'paris' || (l.postal_code || '').startsWith('75')))
    : allListings;

  const name = locale === 'en' ? (category.name_en ?? category.name_fr) : category.name_fr;
  const description = locale === 'en' ? category.description_en : category.description_fr;

  // Forme légère pour le filtre client
  const filterListings = visibleListings.map((l) => ({
    id: l.id,
    slug: l.slug,
    name: l.name,
    subtitle_fr: l.subtitle_fr,
    city: l.city,
    postal_code: l.postal_code,
    cover_image: l.cover_image,
    tags: l.tags.map((t) => t.tag.name_fr || t.tag.slug),
    hours: l.hours
  }));

  // JSON-LD CollectionPage
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${name} — parislgbt`,
    description: description || `Lieux ${name} LGBT-friendly`,
    hasPart: visibleListings.slice(0, 20).map((l) => ({
      '@type': 'LocalBusiness',
      name: l.name,
      address: l.street ? { '@type': 'PostalAddress', streetAddress: l.street, postalCode: l.postal_code, addressLocality: l.city } : undefined,
      url: `/${locale}/listing/${l.slug}`
    }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <header className="mb-10">
          <nav className="text-xs text-white/40 mb-4 flex items-center gap-1.5 flex-wrap">
            <a href={`/${locale}`} className="hover:text-white">Accueil</a>
            <span>›</span>
            <a href={`/${locale}/lieux`} className="hover:text-white">Lieux</a>
            <span>›</span>
            <span className="text-white/60">{name}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-display font-black gradient-text mb-4">{name}</h1>
          {description && <p className="text-lg text-white/70 max-w-3xl">{description}</p>}
        </header>

        {filterListings.length === 0 ? (
          <div className="text-center py-20 opacity-60">Aucun lieu pour cette catégorie pour le moment.</div>
        ) : (
          <CategoryClient listings={filterListings} locale={locale} />
        )}
      </main>
    </>
  );
}

export async function generateStaticParams() {
  return [];
}
