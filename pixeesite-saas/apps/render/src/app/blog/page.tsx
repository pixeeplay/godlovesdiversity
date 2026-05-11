import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentOrg, getCurrentTenantDb } from '@/lib/tenant';
import { PublicShell } from '@/components/PublicShell';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function BlogIndex() {
  const org = await getCurrentOrg();
  if (!org) notFound();
  const db = await getCurrentTenantDb();
  const articles = await db?.article.findMany({
    where: { status: 'published' } as any,
    orderBy: { createdAt: 'desc' },
    take: 50,
  }).catch(() => []) || [];

  return (
    <PublicShell org={org}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 42, margin: '0 0 8px', color: org.primaryColor }}>Blog</h1>
        <p style={{ opacity: 0.6, marginBottom: 32 }}>Articles, actualités, réflexions.</p>
        {articles.length === 0 ? (
          <p style={{ opacity: 0.5, textAlign: 'center', padding: 48 }}>Aucun article publié pour l'instant.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {articles.map((a: any) => (
              <Link key={a.id} href={`/blog/${a.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <article style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden', transition: 'transform .2s' }}>
                  {a.coverImage && <div style={{ aspectRatio: '16/9', background: `url(${a.coverImage}) center/cover` }} />}
                  <div style={{ padding: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{a.title}</h3>
                    {a.excerpt && <p style={{ opacity: 0.7, fontSize: 13, marginTop: 6 }}>{a.excerpt}</p>}
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 12 }}>
                      {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
