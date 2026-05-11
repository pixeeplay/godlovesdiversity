import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentOrg, getCurrentTenantDb } from '@/lib/tenant';
import { PublicShell } from '@/components/PublicShell';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getCurrentOrg();
  if (!org) notFound();
  const db = await getCurrentTenantDb();
  const article = await db?.article.findUnique({ where: { slug } }).catch(() => null);
  if (!article || (article.status !== 'published' && article.status !== undefined)) notFound();

  return (
    <PublicShell org={org}>
      <article style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <Link href="/blog" style={{ fontSize: 13, color: org.primaryColor, textDecoration: 'none' }}>← Retour au blog</Link>
        <h1 style={{ fontSize: 42, margin: '12px 0 8px' }}>{article.title}</h1>
        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 24 }}>
          {new Date(article.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        {article.coverImage && (
          <img src={article.coverImage} alt={article.title} style={{ width: '100%', borderRadius: 12, marginBottom: 24 }} />
        )}
        {article.excerpt && (
          <p style={{ fontSize: 18, opacity: 0.8, marginBottom: 24 }}>{article.excerpt}</p>
        )}
        <div style={{ fontSize: 16, lineHeight: 1.7, opacity: 0.9 }}
          dangerouslySetInnerHTML={{ __html: article.bodyHtml || '<p>(article vide)</p>' }} />
      </article>
    </PublicShell>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getCurrentTenantDb();
  const article = await db?.article.findUnique({ where: { slug } }).catch(() => null);
  if (!article) return { title: 'Article introuvable' };
  return {
    title: article.title,
    description: article.excerpt || article.title,
    openGraph: {
      title: article.title,
      description: article.excerpt || article.title,
      images: article.coverImage ? [article.coverImage] : undefined,
    },
  };
}
