'use client';
import { useEffect, useState, useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { NeonHeart } from './NeonHeart';

type Banner = {
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  cta1Text: string | null;
  cta1Url: string | null;
  cta2Text: string | null;
  cta2Url: string | null;
  accentColor: string | null;
};

const ROTATE_MS = 7000;

export function HeroBannerCarousel({ banners, logoUrl }: { banners: Banner[]; logoUrl?: string | null }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused || banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, ROTATE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, banners.length]);

  if (!banners.length) return null;

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: 'var(--hero-bg, #0a0314)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Backdrop static */}
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.mediaUrl} alt="" className="w-full h-full object-cover" />
                )}
                {/* Voile pour lisibilité du texte — léger pour ne pas masquer la vidéo */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/30" />
              </div>
            )}

            <div className={`container-wide relative grid gap-12 items-center min-h-[620px] py-20 ${b.mediaUrl ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
              {/* Cœur néon ou logo — masqué si la bannière a son propre média (image/vidéo) */}
              {!b.mediaUrl && (
                <div className="flex justify-center lg:justify-start">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="max-h-72 object-contain heart-glow" />
                  ) : (
                    <NeonHeart size={320} />
                  )}
                </div>
              )}

              {/* Texte */}
              <div className={b.mediaUrl ? 'max-w-2xl' : ''}>
                {b.eyebrow && (
                  <p className="text-xs uppercase tracking-[0.4em] mb-4" style={{ color: b.accentColor || '#FF2BB1' }}>
                    {b.eyebrow}
                  </p>
                )}
                <h1
                  className="font-display font-black leading-[0.9] tracking-tight neon-title"
                  style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
                >
                  {b.title}
                </h1>
                {b.subtitle && (
                  <p className="mt-6 text-lg md:text-xl text-white/85 max-w-lg leading-relaxed">
                    {b.subtitle}
                  </p>
                )}
                <div className="mt-8 flex flex-wrap gap-3">
                  {b.cta1Text && b.cta1Url && (
                    <a
                      href={b.cta1Url}
                      className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-white font-bold uppercase text-xs tracking-widest shadow-[0_0_30px_rgba(255,43,177,.45)] transition hover:opacity-90"
                      style={{ background: `linear-gradient(135deg, ${b.accentColor || '#FF2BB1'}, #8B5CF6)` }}
                    >
                      {b.cta1Text} <ArrowRight size={14} />
                    </a>
                  )}
                  {b.cta2Text && b.cta2Url && (
                    <a href={b.cta2Url} className="btn-ghost uppercase text-xs tracking-widest">
                      {b.cta2Text}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contrôles */}
      {banners.length > 1 && (
        <>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Bannière ${i + 1}`}
                className={`transition-all rounded-full ${i === index ? 'w-8 h-2 bg-brand-pink' : 'w-2 h-2 bg-white/30'}`}
              />
            ))}
          </div>
          <button
            onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 hover:bg-brand-pink/30 transition flex items-center justify-center text-white"
            aria-label="Précédent"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % banners.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 hover:bg-brand-pink/30 transition flex items-center justify-center text-white"
            aria-label="Suivant"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </section>
  );
}
