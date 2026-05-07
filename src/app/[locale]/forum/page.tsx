import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { MessageSquare, Pin, Lock, Users, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Forum — parislgbt' };

export default async function ForumPage() {
  let categories: any[] = [];
  let recentThreads: any[] = [];
  try {
    categories = await prisma.forumCategory.findMany({ orderBy: { order: 'asc' } });
    recentThreads = await prisma.forumThread.findMany({
      where: { status: 'active' },
      include: { category: true, author: { select: { name: true, image: true } } },
      orderBy: [{ pinned: 'desc' }, { lastReplyAt: 'desc' }],
      take: 30
    });
  } catch { /* tables not yet migrated */ }

  return (
    <main className="container-wide py-12">
      <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl p-3">
              <MessageSquare size={28} className="text-white" />
            </div>
            <h1 className="font-display font-bold text-4xl">Forum</h1>
          </div>
          <p className="text-zinc-400 max-w-2xl">
            Espaces de discussion thématiques pour la communauté GLD. Partage, écoute, soutien — dans le respect.
          </p>
        </div>
        <Link href="/forum/nouveau" className="bg-violet-500 hover:bg-violet-600 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2">
          <Plus size={14} /> Nouveau sujet
        </Link>
      </header>

      {categories.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <MessageSquare size={48} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 mb-2">Le forum se prépare.</p>
          <p className="text-zinc-500 text-sm">Les premières catégories seront bientôt ouvertes.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Catégories */}
          <section>
            <h2 className="text-xs uppercase font-bold tracking-widest text-violet-400 mb-3">Catégories</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((c) => (
                <Link key={c.id} href={`/forum/${c.slug}`}
                  className="block bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-violet-500/50 transition">
                  <div className="font-bold text-white" style={{ color: c.color || undefined }}>{c.name}</div>
                  {c.description && <div className="text-xs text-zinc-400 mt-1">{c.description}</div>}
                </Link>
              ))}
            </div>
          </section>

          {/* Sujets récents */}
          <section>
            <h2 className="text-xs uppercase font-bold tracking-widest text-violet-400 mb-3">Sujets récents</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
              {recentThreads.map((t) => (
                <Link key={t.id} href={`/forum/sujet/${t.slug}`} className="flex items-center gap-3 p-4 hover:bg-zinc-800/30 transition">
                  {t.pinned && <Pin size={14} className="text-amber-400 shrink-0" />}
                  {t.locked && <Lock size={14} className="text-red-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{t.title}</div>
                    <div className="text-xs text-zinc-500">
                      {t.category.name} · par {t.author?.name || 'Anonyme'} · {t.postsCount} message(s)
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500 shrink-0 hidden sm:block">
                    {t.lastReplyAt ? new Date(t.lastReplyAt).toLocaleDateString('fr-FR') : ''}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
