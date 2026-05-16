import { ArrowRight } from 'lucide-react';

type PhotoItem = {
  id: string;
  url: string;
  caption?: string | null;
  author?: string | null;
  placeName?: string | null;
  city?: string | null;
  country?: string | null;
};

/**
 * GLD V1 — Zone 3 : Galerie mosaïque (8-12 dernières photos communauté)
 * + CTA "Je rejoins la communauté"
 */
export function GalerieMosaique({
  photos,
  galerieHref
}: {
  photos: PhotoItem[];
  galerieHref: string;
}) {
  const slice = photos.slice(0, 8);
  if (slice.length === 0) return null;

  return (
    <section className="py-24 md:py-32" style={{ background: 'var(--hero-bg, #0a0314)' }}>
      <div className="container-wide">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-brand-pink mb-3">Galerie</p>
            <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight">
              Le mouvement à travers le monde
            </h2>
          </div>
          <p className="text-white/70 max-w-md text-sm leading-relaxed">
            Chaque visage, chaque ville, chaque témoignage. Une mosaïque vivante
            d'amour, partout sur la planète.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {slice.map((p, i) => (
            <a
              key={p.id}
              href={galerieHref}
              className={`relative overflow-hidden rounded-xl bg-black/30 border border-white/5 group ${
                i === 0 || i === 5 ? 'md:row-span-2 aspect-square md:aspect-auto' : 'aspect-square'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption || p.placeName || ''}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {(p.city || p.country) && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 opacity-0 group-hover:opacity-100 transition">
                  <p className="text-xs text-white/90 font-semibold">
                    {[p.city, p.country].filter(Boolean).join(' · ')}
                  </p>
                </div>
              )}
            </a>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a href={galerieHref} className="gld-cta-primary">
            Je rejoins la communauté <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
