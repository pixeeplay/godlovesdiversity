import { setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

type Params = { locale: string; slug: string };

async function loadArticle(locale: string, slug: string) {
  const article = await prisma.article.findUnique({
    where: { slug_locale: { slug, locale } }
  });
  if (article && article.published) return article;
  // Fallback : same slug en autre locale (utile si l'utilisateur tape l'URL fr depuis en)
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

// Minimaliste — converti # / ## / ** en HTML basique, conserve les retours à la ligne.
function md2html(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="font-bold text-xl mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-bold text-2xl mt-8 mb-3 text-brand-pink">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-display text-4xl font-black gradient-text mb-6">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-brand-pink underline">$1</a>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/^/, '<p class="mb-4">')
    .replace(/$/, '</p>');
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = await loadArticle(locale, slug);
  if (!article) notFound();

  const md = extractMarkdown(article.content);
  const html = md2html(md);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || article.title,
    datePublished: article.publishedAt?.toISOString(),
    author: { '@type': 'Organization', name: 'parislgbt' }
  };

  return (
    <article className="container-narrow py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl font-black gradient-text mb-4">{article.title}</h1>
        {article.excerpt && <p className="text-white/70 text-lg">{article.excerpt}</p>}
        {article.publishedAt && (
          <p className="text-white/40 text-sm mt-3">
            Publié le {new Date(article.publishedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </header>
      <div
        className="prose prose-invert max-w-none text-white/90 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
