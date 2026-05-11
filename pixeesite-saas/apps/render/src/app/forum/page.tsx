import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentOrg, getCurrentTenantDb } from '@/lib/tenant';
import { PublicShell } from '@/components/PublicShell';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

export default async function ForumIndex() {
  const org = await getCurrentOrg();
  if (!org) notFound();
  const db = await getCurrentTenantDb();
  const threads = await (db as any)?.forumThread?.findMany({
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    take: 100,
    include: { _count: { select: { posts: true } } },
  }).catch(() => []) || [];

  return (
    <PublicShell org={org}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 42, margin: '0 0 8px', color: org.primaryColor }}>Forum</h1>
        <p style={{ opacity: 0.6, marginBottom: 32 }}>Échanges, questions, discussions de la communauté.</p>
        {threads.length === 0 ? (
          <p style={{ opacity: 0.5, textAlign: 'center', padding: 48 }}>Aucun sujet pour l'instant.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {threads.map((t: any) => (
              <Link key={t.id} href={`/forum/${t.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <article style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {t.pinned && <span style={{ fontSize: 11 }}>📌</span>}
                      {t.title}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                      par {t.authorName || t.authorEmail || 'anon'} · {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, opacity: 0.6 }}>
                    <div>{t._count?.posts ?? 0} réponse(s)</div>
                    <div>{t.views || 0} vues</div>
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
