import { setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { markdownToHtml, extractBoldNames, fuzzyMatchVenue } from '@/lib/markdown';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

type Params = { locale: string; slug: string };

async function loadArticle(locale: string, slug: string) {
  const article = await prisma.article.findUnique({
    where: { slug_locale: { slug, locale } }
  });
  if (article && article.published) return article;
  return prisma.article.findFirst({ where: { slug, published: true } });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const a = await loadArticle(locale, slug);
  if (!a) return { title: 'Article introuvable' };
  return {
    title: `${a.title} | parislgbt`,
    description: a.excerpt || a.title,
    openGraph: { title: a.title, description: a.excerpt || a.title, images: a.coverImage ? [a.coverImage] : [] }
  };
}

function extractMarkdown(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const c = content as Record<string, unknown>;
    if (typeof c.body === 'string') return c.body;
    if (typeof c.markdown === 'string') return c.markdown;
    if (typeof c.html === 'string') return c.html;
  }
  return '';
}

// Devine la ville depuis le slug (top-10-bars-lgbt-paris -> paris)
function guessCityFromSlug(slug: string): string | null {
  const known = ['paris', 'lyon', 'marseille', 'toulouse', 'nice', 'bordeaux', 'lille', 'strasbourg', 'montpellier', 'nantes', 'rennes', 'grenoble'];
  for (const c of known) {
    if (slug.endsWith(`-${c}`) || slug.includes(`-${c}-`)) return c;
  }
  return null;
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = await loadArticle(locale, slug);
  if (!article) notFound();

  const md = extractMarkdown(article.content);
  const html = markdownToHtml(md);
  const mentionedNames = extractBoldNames(md);
  const guessedCity = guessCityFromSlug(slug);

  // Fuzzy match : on charge un pool de Listings (par ville si on a deviné) puis on filtre
  let mentionedListings: any[] = [];
  if (mentionedNames.length > 0) {
    const pool = await prisma.listing.findMany({
      where: {
        status: 'PUBLISHED',
        ...(guessedCity ? { city: { equals: guessedCity, mode: 'insensitive' as const } } : {})
      },
      select: { id: true, slug: true, name: true, city: true, postal_code: true, cover_image: true, subtitle_fr: true },
      take: 500
    });
    const seen = new Set<string>();
    for (const mdName of mentionedNames) {
      for (const l of pool) {
        if (seen.has(l.id)) continue;
        if (fuzzyMatchVenue(mdName, l.name)) {
          mentionedListings.push(l);
          seen.add(l.id);
          if (mentionedListings.length >= 12) break;
        }
      }
      if (mentionedListings.length >= 12) break;
    }
  }

  // Articles related (même ville, autres catégories)
  const relatedArticles = guessedCity
    ? await prisma.article.findMany({
        where: {
          published: true,
          locale,
          slug: { contains: guessedCity },
          NOT: { id: article.id }
        },
        select: { slug: true, title: true, excerpt: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: 4
      })
    : [];

  // Article précédent / suivant (par date)
  const allArticles = await prisma.article.findMany({
    where: { published: true, locale, slug: { startsWith: 'top-10-' } },
    select: { slug: true, title: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' }
  });
  const idx = allArticles.findIndex((a) => a.slug === slug);
  const prevArticle = idx > 0 ? allArticles[idx - 1] : null;
  const nextArticle = idx < allArticles.length - 1 ? allArticles[idx + 1] : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || article.title,
    datePublished: article.publishedAt?.toISOString(),
    author: { '@type': 'Organization', name: 'parislgbt' },
    mentions: mentionedListings.map((l) => ({
      '@type': 'LocalBusiness',
      name: l.name,
      address: { '@type': 'PostalAddress', addressLocality: l.city, postalCode: l.postal_code }
    }))
  };

  return (
    <article className="container-narrow py-12 md:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <nav className="text-xs text-white/40 mb-6 flex items-center gap-1.5 flex-wrap">
        <Link href={`/${locale}` as any} className="hover:text-white">Accueil</Link>
        <span>›</span>
        <Link href={`/${locale}/blog` as any} className="hover:text-white">Guides &amp; Top 10</Link>
        <span>›</span>
        <span className="text-white/60 truncate">{article.title}</span>
      </nav>

      <header className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl font-black gradient-text mb-4">{article.title}</h1>
        {article.excerpt && <p className="text-white/70 text-lg">{article.excerpt}</p>}
        {article.publishedAt && (
          <p className="text-white/40 text-sm mt-3">
            Publié le {new Date(article.publishedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            {mentionedListings.length > 0 && (
              <> · <span className="text-pink-400">{mentionedListings.length} lieu{mentionedListings.length > 1 ? 'x' : ''} mentionné{mentionedListings.length > 1 ? 's' : ''}</span></>
            )}
          </p>
        )}
      </header>

      <div
        className="article-body max-w-none text-white/90"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Bloc "Lieux mentionnés" avec liens vers les vraies fiches */}
      {mentionedListings.length > 0 && (
        <section className="mt-14 pt-8 border-t border-white/10">
          <h2 className="text-2xl font-display font-black mb-5 flex items-center gap-2">
            <MapPin size={20} className="text-pink-400" />
            Lieux mentionnés dans cet article
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mentionedListings.map((l) => (
              <Link
                key={l.id}
                href={`/${locale}/listing/${l.slug}` as any}
                className="group flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:border-pink-500/50 bg-white/5 hover:bg-pink-500/5 transition"
              >
                {l.cover_image ? (
                  <img src={l.cover_image} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} className="text-pink-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white group-hover:text-pink-300 truncate">{l.name}</div>
                  {l.subtitle_fr && <div className="text-xs text-white/50 truncate">{l.subtitle_fr}</div>}
                  <div className="text-[10px] text-white/40 mt-0.5">{l.city}{l.postal_code ? ` · ${l.postal_code}` : ''}</div>
                </div>
                <ArrowRight size={14} className="text-white/30 group-hover:text-pink-400 group-hover:translate-x-0.5 transition flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Articles related (même ville) */}
      {relatedArticles.length > 0 && (
        <section className="mt-14 pt-8 border-t border-white/10">
          <h2 className="text-2xl font-display font-black mb-5 flex items-center gap-2">
            <Sparkles size={20} className="text-amber-400" />
            Aussi à {guessedCity ? guessedCity[0].toUpperCase() + guessedCity.slice(1) : ''}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedArticles.map((a) => (
              <Link
                key={a.slug}
                href={`/${locale}/blog/${a.slug}` as any}
                className="group block p-4 rounded-xl border border-white/10 hover:border-amber-500/50 bg-white/5 hover:bg-amber-500/5 transition"
              >
                <div className="font-bold text-white group-hover:text-amber-300 mb-1">{a.title}</div>
                {a.excerpt && <div className="text-xs text-white/60 line-clamp-2">{a.excerpt}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Navigation prev/next */}
      {(prevArticle || nextArticle) && (
        <nav className="mt-14 pt-8 border-t border-white/10 grid grid-cols-2 gap-3">
          {prevArticle ? (
            <Link
              href={`/${locale}/blog/${prevArticle.slug}` as any}
              className="group flex items-center gap-3 p-4 rounded-xl border border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 transition"
            >
              <ChevronLeft size={20} className="text-white/40 group-hover:text-violet-400 flex-shrink-0" />
              <div className="text-right flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-white/40">Précédent</div>
                <div className="font-bold text-white group-hover:text-violet-300 truncate">{prevArticle.title}</div>
              </div>
            </Link>
          ) : <div />}
          {nextArticle ? (
            <Link
              href={`/${locale}/blog/${nextArticle.slug}` as any}
              className="group flex items-center gap-3 p-4 rounded-xl border border-white/10 hover:border-pink-500/50 hover:bg-pink-500/5 transition"
            >
              <div className="text-left flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-white/40">Suivant</div>
                <div className="font-bold text-white group-hover:text-pink-300 truncate">{nextArticle.title}</div>
              </div>
              <ChevronRight size={20} className="text-white/40 group-hover:text-pink-400 flex-shrink-0" />
            </Link>
          ) : <div />}
        </nav>
      )}

      {/* CTA retour blog */}
      <div className="mt-10 text-center">
        <Link
          href={`/${locale}/blog` as any}
          className="inline-flex items-center gap-2 text-white/60 hover:text-pink-300 text-sm transition"
        >
          ← Tous les guides &amp; Top 10
        </Link>
      </div>
    </article>
  );
}
