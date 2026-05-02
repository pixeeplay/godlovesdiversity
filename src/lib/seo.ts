import type { Metadata } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gld.pixeeplay.com';
const DEFAULT_IMAGE = `${BASE}/og-default.png`;

type SeoOpts = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  locale?: 'fr' | 'en' | 'es' | 'pt';
  publishedTime?: Date | string;
  authorName?: string;
  noIndex?: boolean;
};

const SITE_NAME = 'God Loves Diversity';
const DEFAULT_DESC = "Mouvement interreligieux pour l'inclusion LGBT+. Photos d'églises, mosquées, synagogues et temples du monde entier qui célèbrent la diversité.";
const KEYWORDS = [
  'God Loves Diversity', 'foi inclusive', 'religion LGBT', 'église inclusive',
  'mosquée inclusive', 'synagogue inclusive', 'spiritualité LGBT', 'théologie queer',
  'diversité religieuse', 'tolérance interreligieuse', 'pride spirituelle',
  'amour universel', 'foi et homosexualité'
];

export function buildMetadata(o: SeoOpts = {}): Metadata {
  const title = o.title ? `${o.title} — ${SITE_NAME}` : `${SITE_NAME} — Foi & Diversité`;
  const description = o.description || DEFAULT_DESC;
  const url = `${BASE}${o.path || ''}`;
  const image = o.image || DEFAULT_IMAGE;
  const locale = o.locale || 'fr';

  return {
    metadataBase: new URL(BASE),
    title,
    description,
    keywords: KEYWORDS,
    alternates: {
      canonical: url,
      languages: {
        'fr': locale === 'fr' ? url : url.replace(/\/(en|es|pt)/, ''),
        'en': `${BASE}/en${o.path || ''}`,
        'es': `${BASE}/es${o.path || ''}`,
        'pt': `${BASE}/pt${o.path || ''}`
      }
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      locale: locale === 'fr' ? 'fr_FR' : locale === 'en' ? 'en_US' : locale === 'es' ? 'es_ES' : 'pt_PT',
      type: o.type === 'product' ? 'website' : (o.type || 'website'),
      publishedTime: o.publishedTime ? (typeof o.publishedTime === 'string' ? o.publishedTime : o.publishedTime.toISOString()) : undefined,
      authors: o.authorName ? [o.authorName] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      creator: '@GodLovesDiv'
    },
    robots: o.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-touch-icon.png'
    }
  };
}

/** JSON-LD schema.org pour Organization (à mettre dans le layout root) */
export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'NGO',
  name: SITE_NAME,
  alternateName: 'GLD',
  url: BASE,
  logo: `${BASE}/logo.png`,
  description: DEFAULT_DESC,
  sameAs: [
    'https://www.facebook.com/godlovesdiversity',
    'https://www.instagram.com/godlovesdiversity',
    'https://twitter.com/GodLovesDiv'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'contact@godlovesdiversity.org',
    availableLanguage: ['French', 'English', 'Spanish', 'Portuguese']
  }
};

/** JSON-LD pour une photo */
export function photoJsonLd(p: { id: string; placeName?: string | null; caption?: string | null; city?: string | null; country?: string | null; imageUrl: string; createdAt: Date }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: p.imageUrl,
    name: p.placeName || 'Photo God Loves Diversity',
    description: p.caption || `Photo prise à ${p.city || ''} ${p.country || ''}`,
    contentLocation: p.city || p.country ? {
      '@type': 'Place',
      name: [p.city, p.country].filter(Boolean).join(', ')
    } : undefined,
    datePublished: p.createdAt.toISOString(),
    url: `${BASE}/photo/${p.id}`
  };
}

/** JSON-LD pour un produit */
export function productJsonLd(p: { slug: string; title: string; description: string | null; priceCents: number; currency: string; images: string[]; stock: number | null }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: p.description,
    image: p.images,
    url: `${BASE}/boutique/${p.slug}`,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: `${BASE}/boutique/${p.slug}`,
      priceCurrency: p.currency,
      price: (p.priceCents / 100).toFixed(2),
      availability: (p.stock === null || p.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    }
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url
    }))
  };
}
