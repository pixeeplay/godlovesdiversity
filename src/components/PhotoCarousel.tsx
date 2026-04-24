'use client';
import { useMemo } from 'react';
import { MapPin } from 'lucide-react';

const TYPE_META: Record<string, { label: string; color: string; anim: string }> = {
  CHURCH:       { label: '⛪ Église',        color: '#FF2BB1', anim: 'photo-float' },
  MOSQUE:       { label: '🕌 Mosquée',      color: '#22D3EE', anim: 'photo-pulse' },
  SYNAGOGUE:    { label: '✡️ Synagogue',    color: '#FBBF24', anim: 'photo-shine' },
  TEMPLE:       { label: '🛕 Temple',       color: '#34D399', anim: 'photo-spin' },
  PUBLIC_SPACE: { label: '🌆 Espace public', color: '#8B5CF6', anim: 'photo-sway' },
  OTHER:        { label: '📍 Lieu',          color: '#94A3B8', anim: 'photo-float' }
};

type Photo = {
  id: string; url: string; isDemo: boolean;
  caption: string | null; placeName: string | null; placeType: string | null;
  city: string | null; country: string | null; author: string | null;
};

/** Mélange stable avec seed basé sur la date du jour — change chaque jour */
function shuffleDaily<T>(arr: T[]): T[] {
  const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 6)); // change toutes les 6h
  const a = [...arr];
  let rng = seed;
  for (let i = a.length - 1; i > 0; i--) {
    rng = (rng * 9301 + 49297) % 233280;
    const j = Math.floor((rng / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function PhotoCarousel({ photos, title }: { photos: Photo[]; title: string }) {
  // Shuffle côté client (stable par session)
  const shuffled = useMemo(() => shuffleDaily(photos), [photos]);

  if (!shuffled.length) return null;

  // On duplique suffisamment pour que la boucle fonctionne (min 3 × 4 cards = 12)
  const minDupes = Math.max(3, Math.ceil(12 / shuffled.length));
  const items = Array.from({ length: minDupes }, () => shuffled).flat();

  return (
    <section className="py-16 overflow-hidden">
      <div className="container-wide flex items-end justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-pink mb-2">{title}</p>
          <h2 className="font-display text-3xl md:text-5xl font-bold neon-title">
            Le mouvement à travers le monde
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-white/50 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-brand-pink animate-pulse" /> Défilement auto
        </div>
      </div>

      {/* Marquee CSS — fluide, continue, pause au survol */}
      <div className="photo-marquee">
        <div className="photo-marquee-track">
          {items.map((p, i) => {
            const meta = TYPE_META[p.placeType || 'OTHER'] || TYPE_META.OTHER;
            return (
              <article
                key={`${p.id}-${i}`}
                className="photo-card shrink-0 w-72 stained-card overflow-hidden group"
                style={{ '--card-color': meta.color } as React.CSSProperties}
              >
                <div className="aspect-[4/5] bg-zinc-900 relative overflow-hidden">
                  {p.isDemo ? (
                    <div
                      className="w-full h-full flex items-center justify-center text-6xl"
                      style={{
                        background: `linear-gradient(135deg, ${meta.color}55, ${meta.color}22, #000)`
                      }}
                    >
                      <span className={meta.anim}>{meta.label.split(' ')[0]}</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt="" className={`w-full h-full object-cover ${meta.anim}`} />
                  )}
                  {/* Halo coloré qui respire selon le type de lieu */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${meta.color}22, transparent 70%)`,
                      mixBlendMode: 'screen'
                    }}
                  />
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full">
                    {meta.label}
                  </div>
                </div>
                <div className="p-4">
                  {p.placeName && <div className="font-bold truncate">{p.placeName}</div>}
                  <div className="text-white/60 text-sm flex items-center gap-1 mb-2">
                    <MapPin size={12} style={{ color: meta.color }} />
                    {p.city || ''}{p.city && p.country ? ', ' : ''}{p.country || ''}
                  </div>
                  {p.caption && <p className="text-white/70 text-sm line-clamp-3 italic">"{p.caption}"</p>}
                  {p.author && <p className="text-white/40 text-xs mt-2">— {p.author}</p>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
