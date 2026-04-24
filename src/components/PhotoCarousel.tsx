'use client';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

const TYPE_LABEL: Record<string, string> = {
  CHURCH: '⛪ Église',
  MOSQUE: '🕌 Mosquée',
  SYNAGOGUE: '✡️ Synagogue',
  TEMPLE: '🛕 Temple',
  PUBLIC_SPACE: '🌆 Espace public',
  OTHER: '📍 Lieu'
};

type Photo = {
  id: string;
  url: string;
  isDemo: boolean;
  caption: string | null;
  placeName: string | null;
  placeType: string | null;
  city: string | null;
  country: string | null;
  author: string | null;
};

export function PhotoCarousel({ photos, title }: { photos: Photo[]; title: string }) {
  const ref = useRef<HTMLDivElement>(null);

  if (!photos.length) return null;

  function scroll(dir: 'left' | 'right') {
    const el = ref.current; if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  }

  return (
    <section className="container-wide py-16">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-pink mb-2">{title}</p>
          <h2 className="font-display text-3xl md:text-5xl font-bold neon-title">
            Le mouvement à travers le monde
          </h2>
        </div>
        <div className="hidden md:flex gap-2">
          <button onClick={() => scroll('left')} className="btn-ghost p-3"><ChevronLeft size={18} /></button>
          <button onClick={() => scroll('right')} className="btn-ghost p-3"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-6 px-6"
        style={{ scrollbarWidth: 'none' }}
      >
        {photos.map((p) => (
          <article
            key={p.id}
            className="snap-start shrink-0 w-72 stained-card overflow-hidden group cursor-pointer"
          >
            <div className="aspect-[4/5] bg-zinc-900 relative">
              {p.isDemo ? (
                <div className="w-full h-full bg-gradient-to-br from-brand-pink/30 via-purple-700/20 to-blue-700/30 flex items-center justify-center text-5xl">❤️</div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              )}
              {p.placeType && (
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  {TYPE_LABEL[p.placeType] || p.placeType}
                </div>
              )}
            </div>
            <div className="p-4">
              {p.placeName && <div className="font-bold truncate">{p.placeName}</div>}
              <div className="text-white/60 text-sm flex items-center gap-1 mb-2">
                <MapPin size={12} /> {p.city || ''}{p.city && p.country ? ', ' : ''}{p.country || ''}
              </div>
              {p.caption && <p className="text-white/70 text-sm line-clamp-3 italic">"{p.caption}"</p>}
              {p.author && <p className="text-white/40 text-xs mt-2">— {p.author}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
