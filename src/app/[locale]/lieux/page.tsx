/**
 * /fr/lieux — Annuaire LGBT unifié (carte + liste).
 *
 * Source de données : table Listing (3378 entries via SEO Boosts) + Venue legacy (si présentes).
 * On mappe Listing → forme Venue pour réutiliser VenuesDirectory / VenuesMap sans toucher au front.
 *
 * Filtrage scope :
 *   - parislgbt.com  → city=Paris OR postal_code starts with 75
 *   - lgbtfrance.fr  → tout
 *   - staging        → tout
 */
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { VenuesDirectory } from '@/components/VenuesDirectory';
import { detectScope, scopedWhere, type Scope } from '@/lib/scope';

export const dynamic = 'force-dynamic';
export const revalidate = 600;
export const metadata = { title: 'Lieux LGBTQ+ — parislgbt' };

// Mapping slug catégorie SEO → VenueType pour réutiliser les icônes/couleurs de VenuesMap
const CAT_SLUG_TO_TYPE: Record<string, string> = {
  bars: 'BAR',
  restaurant: 'RESTAURANT',
  cabarets: 'CULTURAL',
  clubs: 'CLUB',
  saunas: 'BAR',
  cruising: 'BAR',
  associations: 'ASSOCIATION',
  collectifs: 'ASSOCIATION',
  sante: 'HEALTH',
  boutiques: 'SHOP',
  hebergement: 'HOTEL',
  visites: 'CULTURAL'
};

function listingToVenueShape(l: any): any {
  const firstCatSlug = l.categories?.[0]?.category?.slug;
  return {
    id: l.id,
    slug: l.slug,
    name: l.name,
    type: (firstCatSlug ? CAT_SLUG_TO_TYPE[firstCatSlug] : null) || 'OTHER',
    city: l.city,
    country: l.country || 'France',
    postalCode: l.postal_code,
    lat: l.lat,
    lng: l.lng,
    coverImage: l.cover_image,
    logo: l.logo,
    description: l.description_fr,
    shortDescription: l.subtitle_fr,
    rating: 'FRIENDLY',
    featured: l.featured ?? false,
    website: l.website,
    phone: l.phone,
    instagram: l.instagram_url,
    facebook: l.facebook_url,
    events: [],
    _source: 'listing' as const
  };
}

export default async function LieuxPage() {
  const h = headers();
  const hostScope: Scope = detectScope(h.get('host') || '');
  // Preview scope override (cookie/query handled in middleware)
  const previewScope = (h.get('x-site-scope') as Scope | null) || hostScope;

  let items: any[] = [];

  try {
    // 1. Récupère les Listings (3378 max) filtrés selon le scope (cercles concentriques)
    const where: any = { status: 'PUBLISHED' };
    Object.assign(where, scopedWhere(previewScope));

    const listings = await prisma.listing.findMany({
      where,
      include: { categories: { include: { category: true } } },
      orderBy: [{ featured: 'desc' }, { lat: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
      take: 1000
    });
    items = listings.map(listingToVenueShape);
  } catch { /* table missing */ }

  // 2. Récupère aussi les Venues si présentes (legacy + ajouts manuels via BO)
  try {
    const venues = await prisma.venue.findMany({
      where: { published: true },
      include: { events: { where: { published: true, startsAt: { gte: new Date() } }, take: 2, orderBy: { startsAt: 'asc' } } },
      orderBy: [{ featured: 'desc' }, { rating: 'asc' }, { name: 'asc' }],
      take: 200
    });
    // Dédupe par slug : si une Venue manuelle a déjà un slug présent dans listings, on garde la Venue
    const venueSlugs = new Set(venues.map((v) => v.slug));
    items = items.filter((it) => !venueSlugs.has(it.slug));
    items = [...venues, ...items];
  } catch { /* venue table not migrated */ }

  return <VenuesDirectory initial={items} />;
}
