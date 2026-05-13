/**
 * /category/[slug] — Page catégorie (compat URL WordPress parislgbt.com)
 * Liste tous les Listings rattachés à cette catégorie, filtrés par scope (site).
 * SEO : title + description i18n + JSON-LD CollectionPage.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { unstable_setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { getScope } from '@/lib/scope';
import type { Metadata } from 'next';

// Force dynamic — DB queries at request time, not build time
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

  // Filter listings by scope (site_id matches current scope domain)
  const allListings = category.listings.map(c => c.listing).filter(l => l.status === 'PUBLISHED');
  const visibleListings = scope === 'paris'
    ? allListings.filter(l => l.city?.toLowerCase() === 'paris')
    : allListings;

  const name = locale === 'en' ? (category.name_en ?? category.name_fr) : category.name_fr;
  const description = locale === 'en' ? category.description_en : category.description_fr;

  // JSON-LD CollectionPage
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${name} — parislgbt`,
    description: description || `Lieux ${name} LGBT-friendly`,
    hasPart: visibleListings.slice(0, 20).map(l => ({
      '@type': 'LocalBusiness',
      name: l.name,
      address: l.street ? { '@type': 'PostalAddress', streetAddress: l.street, postalCode: l.postal_code, addressLocality: l.city } : undefined,
      url: `/${locale}/listing/${l.slug}`
    }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">{name}</h1>
        {description && <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-12 max-w-3xl">{description}</p>}
        <p className="text-sm opacity-70 mb-6">{visibleListings.length} lieu·x dans cette catégorie</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleListings.map(l => (
            <Link
              key={l.id}
              href={`/${locale}/listing/${l.slug}`}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:shadow-lg transition group"
            >
              {l.cover_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.cover_image} alt={l.name} className="w-full h-48 object-cover group-hover:scale-105 transition" />
              )}
              <div className="p-5">
                <h3 className="text-xl font-bold mb-1">{l.name}</h3>
                {l.subtitle_fr && <p className="text-sm opacity-70 line-clamp-2">{l.subtitle_fr}</p>}
                <p className="text-xs opacity-50 mt-3">{l.city ?? 'Paris'} {l.postal_code ?? ''}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {l.tags.slice(0, 3).map(t => (
                    <span key={t.tag.id} className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 opacity-80">{t.tag.name_fr}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
        {visibleListings.length === 0 && (
          <div className="text-center py-16 opacity-60">Aucun lieu pour cette catégorie pour le moment.</div>
        )}
      </main>
    </>
  );
}

export async function generateStaticParams() {
  // Generate ISG paths for known categories
  return [];
}
