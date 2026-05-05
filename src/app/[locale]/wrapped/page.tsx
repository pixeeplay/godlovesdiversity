import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Sparkles, Heart, MessageSquare, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mon GLD Wrapped' };

export default async function P() {
  const s = await getServerSession(authOptions);
  if (!s?.user) {
    return (
      <main className="container-wide py-20 max-w-md text-center">
        <Sparkles size={48} className="text-fuchsia-400 mx-auto mb-3" />
        <h1 className="text-2xl font-bold mb-2">✨ Mon GLD Wrapped</h1>
        <p className="text-zinc-400 mb-4">Connecte-toi pour voir ton année GLD : témoignages, soutiens, partages, badges débloqués…</p>
        <Link href="/admin/login?next=/wrapped" className="inline-block bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold px-5 py-2 rounded-full">Se connecter</Link>
        <Link href="/inscription" className="block mt-2 text-fuchsia-400 hover:underline text-sm">Pas encore de compte ?</Link>
      </main>
    );
  }

  const userId = (s.user as any).id;
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  // Stats — best effort, fallback à 0
  let posts = 0, threads = 0, supports = 0;
  try { posts = await prisma.forumPost.count({ where: { authorId: userId, createdAt: { gte: yearStart } } }); } catch {}
  try { threads = await prisma.forumThread.count({ where: { authorId: userId, createdAt: { gte: yearStart } } }); } catch {}

  const yearWord = String(new Date().getFullYear());

  return (
    <main className="container-wide py-12 max-w-3xl">
      <header className="text-center mb-8">
        <div className="inline-block bg-gradient-to-br from-amber-400 via-fuchsia-500 to-violet-600 rounded-2xl p-3 mb-3"><Sparkles size={28} className="text-white" /></div>
        <h1 className="font-display font-bold text-5xl mb-1">Wrapped {yearWord}</h1>
        <p className="text-zinc-400 text-sm">Ton année GLD en chiffres</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Stat icon={MessageSquare} value={posts}    label="Posts forum"    color="fuchsia" />
        <Stat icon={Heart}         value={threads}  label="Sujets ouverts" color="pink" />
        <Stat icon={Sparkles}      value={threads + posts} label="Activité totale" color="violet" />
      </div>

      <div className="bg-gradient-to-br from-fuchsia-500/10 via-violet-500/10 to-amber-500/10 border border-fuchsia-500/30 rounded-2xl p-6 text-center">
        <p className="text-lg text-zinc-200 mb-2">Tu fais partie d'un mouvement de <strong className="text-fuchsia-400">milliers</strong> de personnes qui changent le visage de la foi inclusive.</p>
        <p className="text-sm text-zinc-400">Merci d'être toi. ✨</p>
        <div className="flex gap-2 justify-center mt-4 flex-wrap">
          <Link href="/partager" className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-full">Partager mon Wrapped</Link>
          <Link href="/parrainage" className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-full">Voir mes badges</Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ icon: Icon, value, label, color }: any) {
  return (
    <div className={`bg-${color}-500/10 border border-${color}-500/30 rounded-2xl p-4 text-center`}>
      <Icon size={24} className={`text-${color}-400 mx-auto mb-2`} />
      <div className="text-4xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-400 mt-1">{label}</div>
    </div>
  );
}
