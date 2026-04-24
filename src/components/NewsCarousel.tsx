'use client';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Video } from 'lucide-react';

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  coverVideo: string | null;
  publishedAt: string | null;
  tags: string[];
};

export function NewsCarousel({ articles }: { articles: Article[] }) {
  const ref = useRef<HTMLDivElement>(null);
  if (!articles.length) return null;

  function scroll(dir: 'left' | 'right') {
    const el = ref.current; if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  }

  return (
    <section className="container-wide py-16">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-pink mb-2">Actualités</p>
          <h2 className="font-display text-3xl md:text-5xl font-bold neon-title">
            Dernières nouvelles
          </h2>
        </div>
        <div className="hidden md:flex gap-2">
          <button onClick={() => scroll('left')} className="btn-ghost p-3"><ChevronLeft size={18} /></button>
          <button onClick={() => scroll('right')} className="btn-ghost p-3"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-6 px-6"
        style={{ scrollbarWidth: 'none' }}
      >
        {articles.map((a) => (
          <article key={a.id} className="snap-start shrink-0 w-80 stained-card overflow-hidden group cursor-pointer">
            <div className="aspect-video bg-zinc-900 relative">
              {a.coverVideo ? (
                <>
                  <video src={a.coverVideo} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-brand-pink text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Video size={10} /> VIDÉO
                  </div>
                </>
              ) : a.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-700/30 to-brand-pink/30" />
              )}
            </div>
            <div className="p-4">
              <div className="text-xs text-white/40 mb-2">
                {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              </div>
              <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2">{a.title}</h3>
              {a.excerpt && <p className="text-white/70 text-sm line-clamp-3">{a.excerpt}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {a.tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60">#{t}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
