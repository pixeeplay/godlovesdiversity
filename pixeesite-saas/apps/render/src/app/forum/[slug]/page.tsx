import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentOrg, getCurrentTenantDb } from '@/lib/tenant';
import { PublicShell } from '@/components/PublicShell';

export const dynamic = 'force-dynamic';

export default async function ForumThreadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getCurrentOrg();
  if (!org) notFound();
  const db = await getCurrentTenantDb();
  const thread = await (db as any)?.forumThread?.findUnique({
    where: { slug },
    include: { posts: { orderBy: { createdAt: 'asc' } } },
  }).catch(() => null);
  if (!thread) notFound();

  // Increment views
  await (db as any).forumThread.update({ where: { id: thread.id }, data: { views: { increment: 1 } } }).catch(() => {});

  return (
    <PublicShell org={org}>
      <article style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <Link href="/forum" style={{ fontSize: 13, color: org.primaryColor, textDecoration: 'none' }}>← Retour au forum</Link>
        <h1 style={{ fontSize: 32, margin: '12px 0 6px' }}>{thread.title}</h1>
        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 24 }}>
          par {thread.authorName || 'anon'} · {new Date(thread.createdAt).toLocaleDateString('fr-FR')}
        </div>
        {thread.body && (
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10, padding: 16, fontSize: 15, lineHeight: 1.6, marginBottom: 24, whiteSpace: 'pre-wrap' }}>
            {thread.body}
          </div>
        )}
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>{thread.posts?.length || 0} réponse(s)</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {(thread.posts || []).map((p: any) => (
            <div key={p.id} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
                {p.authorName || 'anon'} · {new Date(p.createdAt).toLocaleDateString('fr-FR')}
              </div>
              <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{p.body}</div>
            </div>
          ))}
        </div>
      </article>
    </PublicShell>
  );
}
