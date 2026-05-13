/**
 * /tag/[slug] — Page tag (compat URL WordPress parislgbt.com).
 * Liste tous les Listings avec ce tag.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { unstable_setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';

type Params = { locale: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) return { title: 'Tag introuvable' };
  const name = locale === 'en' ? (tag.name_en ?? tag.name_fr) : tag.name_fr;
  return {
    title: `${name} — parislgbt`,
    description: `Tous les lieux LGBT-friendly tagués "${name}".`,
    alternates: { canonical: `/${locale}/tag/${slug}` }
  };
}

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  unstable_setRequestLocale(locale);

  const tag = await prisma.tag.findUnique({
    where: { slug },
    include: {
      listings: {
        include: { listing: { include: { categories: { include: { category: true } } } } }
      }
    }
  });

  if (!tag) notFound();

  const listings = tag.listings.map(t => t.listing).filter(l => l.status === 'PUBLISHED');
  const name = locale === 'en' ? (tag.name_en ?? tag.name_fr) : tag.name_fr;

  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Tag</div>
      <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6">{name}</h1>
      <p className="text-sm opacity-70 mb-12">{listings.length} lieu·x</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
            <div className="p-5">
              <h3 className="text-lg font-bold mb-1">{l.name}</h3>
              {l.subtitle_fr && <p className="text-sm opacity-70 line-clamp-2">{l.subtitle_fr}</p>}
              <p className="text-xs opacity-50 mt-3">{l.city ?? 'Paris'} {l.postal_code ?? ''}</p>
            </div>
          </Link>
        ))}
      </div>
      {listings.length === 0 && (
        <div className="text-center py-16 opacity-60">Aucun lieu avec ce tag pour le moment.</div>
      )}
    </main>
  );
}
