import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MessageSquare, AlertTriangle } from 'lucide-react';
import { ForumCategoriesAdmin } from '@/components/admin/ForumCategoriesAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminForumPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  let categories: any[] = [];
  let threads: any[] = [];
  let flaggedPosts: any[] = [];
  try {
    categories = await prisma.forumCategory.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { threads: true } } }
    });
    threads = await prisma.forumThread.findMany({ include: { category: true, author: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 30 });
    flaggedPosts = await prisma.forumPost.findMany({ where: { status: 'flagged' }, include: { author: { select: { name: true } } }, take: 20 });
  } catch { /* migration */ }

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">
      <header className="flex items-center gap-3 mb-2">
        <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl p-2.5">
          <MessageSquare size={24} className="text-white" />
        </div>
        <h1 className="text-3xl font-display font-bold">Forum (admin)</h1>
      </header>

      <ForumCategoriesAdmin initial={categories} />

      <section>
        <h2 className="text-xs uppercase font-bold tracking-widest text-violet-400 mb-3">Sujets récents ({threads.length})</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {threads.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Aucun sujet.</div>
          ) : threads.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 border-b border-zinc-800 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-white truncate">{t.title}</div>
                <div className="text-[10px] text-zinc-500">{t.category.name} · par {t.author?.name || 'Anonyme'} · {t.postsCount} msg</div>
              </div>
              <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full">{t.status}</span>
            </div>
          ))}
        </div>
      </section>

      {flaggedPosts.length > 0 && (
        <section>
          <h2 className="text-xs uppercase font-bold tracking-widest text-amber-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={12} /> Messages signalés ({flaggedPosts.length})
          </h2>
          <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-4 space-y-2">
            {flaggedPosts.map((p) => (
              <div key={p.id} className="bg-zinc-900 rounded-lg p-3">
                <div className="text-xs text-zinc-400">par {p.author?.name || 'Anonyme'}</div>
                <div className="text-sm text-white mt-1">{p.content.slice(0, 200)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
