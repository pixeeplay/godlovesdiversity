import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ForumThreadClient } from '@/components/ForumThreadClient';
import { Pin, Lock, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ThreadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let thread: any = null;
  let posts: any[] = [];
  try {
    thread = await prisma.forumThread.findUnique({
      where: { slug },
      include: { category: true, author: { select: { name: true, image: true } } }
    });
    if (!thread) notFound();
    posts = await prisma.forumPost.findMany({
      where: { threadId: thread.id, status: 'active' },
      include: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'asc' }
    });
    // Incr vues
    await prisma.forumThread.update({ where: { id: thread.id }, data: { viewsCount: { increment: 1 } } }).catch(() => null);
  } catch { notFound(); }

  return (
    <main className="container-wide py-12 max-w-4xl">
      <Link href={`/forum/${thread.category.slug}`} className="text-violet-400 hover:underline text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> {thread.category.name}
      </Link>

      <header className="mb-6">
        <h1 className="font-display font-bold text-3xl flex items-center gap-3 flex-wrap">
          {thread.pinned && <Pin size={20} className="text-amber-400" />}
          {thread.locked && <Lock size={20} className="text-red-400" />}
          {thread.title}
        </h1>
        <p className="text-zinc-500 text-sm mt-2">
          {posts.length} message(s) · {thread.viewsCount} vues · ouvert par {thread.author?.name || 'Anonyme'} le {new Date(thread.createdAt).toLocaleDateString('fr-FR')}
        </p>
      </header>

      <ForumThreadClient threadId={thread.id} initialPosts={posts} locked={thread.locked} />
    </main>
  );
}
