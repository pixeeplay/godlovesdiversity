import { prisma } from '@/lib/prisma';
import { Video, Heart, Eye } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Témoignages — parislgbt' };

export default async function TestimoniesPage() {
  let testimonies: any[] = [];
  try {
    testimonies = await prisma.videoTestimony.findMany({
      where: { status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  } catch { /* table not yet migrated */ }

  return (
    <main className="container-wide py-12">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-fuchsia-500 to-rose-600 rounded-xl p-3">
            <Video size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-4xl">Témoignages</h1>
        </div>
        <p className="text-zinc-400 max-w-2xl">
          Voix authentiques de femmes et d'hommes — leur foi, leur diversité, leur cheminement.
          Sous-titres FR / EN / ES / PT générés automatiquement par IA.
        </p>
      </header>

      {testimonies.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <Video size={48} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400">Les premiers témoignages arrivent bientôt.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonies.map((t) => (
            <article key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-fuchsia-500/40 transition">
              <div className="aspect-video bg-black">
                {t.videoUrl ? (
                  <video src={t.videoUrl} poster={t.thumbnailUrl} controls className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <Video size={32} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-white">{t.title || `Témoignage de ${t.authorName || 'anonyme'}`}</h3>
                {t.authorName && <div className="text-xs text-zinc-500 mt-1">par {t.authorName}</div>}
                <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-2">
                  <span className="flex items-center gap-1"><Eye size={10} /> {t.views}</span>
                  <span className="flex items-center gap-1"><Heart size={10} /> {t.likes}</span>
                  {t.duration && <span>· {Math.floor(t.duration / 60)}:{String(t.duration % 60).padStart(2, '0')}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
