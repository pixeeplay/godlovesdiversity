import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageSquare, Pin, Lock, Plus, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; category: string }> }) {
  const { category: slug } = await params;

  let category: any = null;
  let threads: any[] = [];
  try {
    category = await prisma.forumCategory.findUnique({ where: { slug } });
    if (!category) notFound();
    threads = await prisma.forumThread.findMany({
      where: { categoryId: category.id, status: 'active' },
      include: { author: { select: { name: true, image: true } } },
      orderBy: [{ pinned: 'desc' }, { lastReplyAt: 'desc' }],
      take: 100
    });
  } catch { notFound(); }

  return (
    <main className="container-wide py-12">
      <Link href="/forum" className="text-violet-400 hover:underline text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Toutes les catégories
      </Link>

      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-3xl" style={{ color: category?.color || undefined }}>
            {category?.name}
          </h1>
          {category?.description && <p className="text-zinc-400 text-sm mt-1">{category.description}</p>}
        </div>
        <Link
          href={`/forum/nouveau?cat=${slug}`}
          className="bg-violet-500 hover:bg-violet-600 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2"
        >
          <Plus size={14} /> Nouveau sujet
        </Link>
      </header>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
        {threads.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
            Aucun sujet pour le moment. Sois le premier à en créer un !
          </div>
        ) : threads.map((t) => (
          <Link key={t.id} href={`/forum/sujet/${t.slug}`} className="flex items-center gap-3 p-4 hover:bg-zinc-800/30 transition">
            {t.pinned && <Pin size={14} className="text-amber-400 shrink-0" />}
            {t.locked && <Lock size={14} className="text-red-400 shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate">{t.title}</div>
              <div className="text-xs text-zinc-500">
                par {t.author?.name || 'Anonyme'} · {t.postsCount} message(s) · {t.viewsCount} vues
              </div>
            </div>
            <div className="text-xs text-zinc-500 shrink-0 hidden sm:block">
              {t.lastReplyAt ? new Date(t.lastReplyAt).toLocaleDateString('fr-FR') : new Date(t.createdAt).toLocaleDateString('fr-FR')}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
