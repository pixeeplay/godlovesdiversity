/**
 * /listing/[slug] — Fiche détaillée d'un lieu (compat URL WordPress).
 * Reproduit EXACTEMENT les URLs de l'ancien site pour préserver le SEO.
 * SEO : JSON-LD LocalBusiness complet (name, address, geo, openingHours, etc.).
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { unstable_setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';

// Force dynamic — DB queries at request time, not build time
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

type Params = { locale: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const listing = await prisma.listing.findFirst({ where: { slug } });
  if (!listing) return { title: 'Lieu introuvable' };
  const title = listing.name;
  const description = locale === 'en' ? (listing.meta_description_en ?? listing.subtitle_en ?? listing.description_en?.slice(0, 160)) : (listing.meta_description_fr ?? listing.subtitle_fr ?? listing.description_fr?.slice(0, 160));
  return {
    title: `${title} — parislgbt`,
    description: description || `${title} - lieu LGBT-friendly à ${listing.city ?? 'Paris'}`,
    alternates: { canonical: `/${locale}/listing/${slug}` },
    openGraph: {
      title,
      description: description || undefined,
      images: listing.cover_image ? [listing.cover_image] : undefined,
      type: 'website'
    }
  };
}

const HOUR_LABELS_FR: Record<string, string> = {
  monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi',
  friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche'
};

export default async function ListingPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  unstable_setRequestLocale(locale);

  const listing = await prisma.listing.findFirst({
    where: { slug },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      region: true
    }
  });

  if (!listing || listing.status !== 'PUBLISHED') notFound();

  const description = locale === 'en' ? (listing.description_en ?? listing.description_fr) : listing.description_fr;
  const subtitle = locale === 'en' ? (listing.subtitle_en ?? listing.subtitle_fr) : listing.subtitle_fr;

  // JSON-LD LocalBusiness (Schema.org) for SEO local
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: listing.name,
    description: description || undefined,
    url: `/${locale}/listing/${slug}`,
    image: listing.cover_image || undefined,
    telephone: listing.phone || undefined,
    email: listing.email || undefined,
    address: listing.street ? {
      '@type': 'PostalAddress',
      streetAddress: listing.street,
      postalCode: listing.postal_code,
      addressLocality: listing.city,
      addressCountry: listing.country
    } : undefined,
    geo: (listing.lat && listing.lng) ? {
      '@type': 'GeoCoordinates',
      latitude: listing.lat,
      longitude: listing.lng
    } : undefined,
    sameAs: [listing.facebook_url, listing.instagram_url, listing.twitter_url].filter(Boolean)
  };
  // openingHours: convert hours JSON to schema.org format
  if (listing.hours && typeof listing.hours === 'object') {
    const dayMap: Record<string, string> = { monday: 'Mo', tuesday: 'Tu', wednesday: 'We', thursday: 'Th', friday: 'Fr', saturday: 'Sa', sunday: 'Su' };
    const oh: string[] = [];
    for (const [day, h] of Object.entries(listing.hours as Record<string, string | null>)) {
      if (h && dayMap[day]) oh.push(`${dayMap[day]} ${h}`);
    }
    if (oh.length) jsonLd.openingHours = oh;
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-5xl mx-auto px-6 py-12">
        {listing.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.cover_image} alt={listing.name} className="w-full h-72 md:h-96 object-cover rounded-3xl mb-8" />
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {listing.categories.map(c => (
            <Link key={c.category.id} href={`/${locale}/category/${c.category.slug}`} className="text-xs px-3 py-1 rounded-full bg-pink-500/10 text-pink-600 hover:bg-pink-500/20">
              {c.category.name_fr}
            </Link>
          ))}
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">{listing.name}</h1>
        {subtitle && <p className="text-xl opacity-70 mb-6">{subtitle}</p>}

        <div className="grid md:grid-cols-3 gap-8 mt-8">
          <div className="md:col-span-2 space-y-6">
            {description && (
              <section>
                <h2 className="text-2xl font-bold mb-3">À propos</h2>
                <p className="whitespace-pre-line leading-relaxed opacity-90">{description}</p>
              </section>
            )}

            {listing.tags.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.tags.map(t => (
                    <Link key={t.tag.id} href={`/${locale}/tag/${t.tag.slug}`} className="text-sm px-3 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      {t.tag.name_fr}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {listing.transport && (
              <section>
                <h2 className="text-2xl font-bold mb-3">Transport</h2>
                <p>{listing.transport}</p>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-3">
              <h3 className="font-bold mb-2">Contact</h3>
              {listing.street && (
                <div className="text-sm">
                  <div className="opacity-70">Adresse</div>
                  <div>{listing.street}</div>
                  <div>{listing.postal_code} {listing.city}</div>
                </div>
              )}
              {listing.phone && (
                <div className="text-sm">
                  <div className="opacity-70">Téléphone</div>
                  <a href={`tel:${listing.phone}`} className="text-pink-600 hover:underline">{listing.phone}</a>
                </div>
              )}
              {listing.website && (
                <div className="text-sm">
                  <div className="opacity-70">Site web</div>
                  <a href={listing.website} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline break-all">{listing.website}</a>
                </div>
              )}
              {listing.email && (
                <div className="text-sm">
                  <div className="opacity-70">Email</div>
                  <a href={`mailto:${listing.email}`} className="text-pink-600 hover:underline">{listing.email}</a>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                {listing.facebook_url && <a href={listing.facebook_url} target="_blank" rel="noopener" aria-label="Facebook" className="opacity-60 hover:opacity-100">FB</a>}
                {listing.instagram_url && <a href={listing.instagram_url} target="_blank" rel="noopener" aria-label="Instagram" className="opacity-60 hover:opacity-100">IG</a>}
                {listing.twitter_url && <a href={listing.twitter_url} target="_blank" rel="noopener" aria-label="Twitter/X" className="opacity-60 hover:opacity-100">X</a>}
              </div>
            </section>

            {listing.hours && typeof listing.hours === 'object' && (
              <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
                <h3 className="font-bold mb-3">Horaires</h3>
                <ul className="text-sm space-y-1">
                  {Object.entries(listing.hours as Record<string, string | null>).map(([day, h]) => (
                    <li key={day} className="flex justify-between">
                      <span className="opacity-70">{HOUR_LABELS_FR[day] ?? day}</span>
                      <span>{h ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
