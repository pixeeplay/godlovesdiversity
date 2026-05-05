import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function P() {
  const s = await getServerSession(authOptions);
  const userId = (s?.user as any)?.id;
  let posts: any[] = [];
  try {
    posts = await prisma.forumPost.findMany({
      where: { authorId: userId }, orderBy: { createdAt: 'desc' }, take: 50,
      include: { thread: { select: { title: true, slug: true, category: { select: { slug: true, name: true } } } } }
    });
  } catch {}
  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-4">💬 Mes posts forum ({posts.length})</h1>
      {posts.length === 0 ? <Empty icon={MessageSquare} text="Aucun post pour le moment." cta="Aller au forum" href="/forum" /> : (
        <div className="space-y-2">
          {posts.map(p => (
            <article key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <Link href={`/forum/sujet/${p.thread?.slug}`} className="font-bold text-sm text-fuchsia-400 hover:underline">{p.thread?.title}</Link>
              <div className="text-[10px] text-zinc-400 mt-0.5">{p.thread?.category?.name} · {new Date(p.createdAt).toLocaleString('fr-FR')}</div>
              <div className="text-sm text-zinc-200 mt-2 line-clamp-3" dangerouslySetInnerHTML={{ __html: p.content }} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
function Empty({ icon: Icon, text, cta, href }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400">
      <Icon size={32} className="mx-auto mb-2 opacity-30" />
      <p>{text}</p>
      {cta && <Link href={href} className="inline-block mt-3 bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-full">{cta}</Link>}
    </div>
  );
}
