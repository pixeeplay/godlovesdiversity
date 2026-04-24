import { setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { Link } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const articles = await prisma.article.findMany({
    where: { published: true, locale },
    orderBy: { publishedAt: 'desc' },
    take: 30
  });
  return (
    <section className="container-wide py-20">
      <h1 className="font-display text-5xl font-black gradient-text mb-10">Blog</h1>
      {articles.length === 0 ? (
        <p className="text-white/50">Aucun article publié pour le moment.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((a) => (
            <Link key={a.id} href={`/blog/${a.slug}` as any}
              className="rounded-2xl border border-white/10 hover:border-brand-pink p-6 transition">
              <h2 className="font-bold text-xl mb-2">{a.title}</h2>
              <p className="text-white/60 text-sm">{a.excerpt}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
