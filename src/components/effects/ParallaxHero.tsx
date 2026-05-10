'use client';
import { useEffect, useRef, useState, CSSProperties } from 'react';

/**
 * Parallax Hero "Stepout" — multi-layers scroll-based parallax.
 *
 * Inspired by https://dribbble.com/shots/24526352 (Exploring Parallax Hero
 * Section for Stepout). 4 layers superposés qui se déplacent à des vitesses
 * différentes au scroll. Foreground silhouette + middle elements + background
 * landscape + floating headline.
 *
 * Usage :
 *   <ParallaxHero
 *     title="God Loves Diversity"
 *     subtitle="Une communauté inclusive"
 *     bgImage="/img/bg-mountains.jpg"
 *     midImage="/img/mid-cloud.png"
 *     fgImage="/img/silhouettes.png"
 *     overlayColor="rgba(15,15,30,0.35)"
 *   />
 */

interface Layer {
  src?: string;
  /** vitesse parallax : 0 = fixe (bouge le moins), 1 = scroll natif */
  speed?: number;
  /** mode de positionnement : center, cover, contain */
  fit?: 'cover' | 'contain' | 'center';
  /** offset Y en px à appliquer en plus du scroll */
  offsetY?: number;
  /** opacité */
  opacity?: number;
  className?: string;
}

export interface ParallaxHeroProps {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  bgImage?: string;
  bgGradient?: string;
  midImage?: string;
  fgImage?: string;
  overlayColor?: string;
  height?: string; // ex: '90vh'
  /** advanced — personnaliser chaque layer */
  layers?: Layer[];
  /** texte flottant supplémentaire (effet déco) */
  floatingText?: string;
  className?: string;
}

export function ParallaxHero({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  bgImage,
  bgGradient = 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
  midImage,
  fgImage,
  overlayColor = 'rgba(0,0,0,0.25)',
  height = '90vh',
  floatingText,
  className = ''
}: ParallaxHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // y = 0 quand le hero commence à sortir par le haut
        setScrollY(-rect.top);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Vitesses parallax (positives = bougent plus lentement vers le bas)
  const layerStyle = (speed: number, extraOffset = 0): CSSProperties => ({
    transform: `translate3d(0, ${scrollY * speed + extraOffset}px, 0)`,
    willChange: 'transform'
  });

  return (
    <section
      ref={containerRef}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height, background: bgGradient }}
    >
      {/* LAYER 1 - Sky / background image (slowest, scrolls slowest = parallax depth) */}
      {bgImage && (
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{
            backgroundImage: `url(${bgImage})`,
            ...layerStyle(0.15)
          }}
        />
      )}

      {/* LAYER 2 - Stars / particles décoratifs */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.6) 1.5px, transparent 1.5px)`,
          backgroundSize: '60px 60px',
          opacity: 0.3,
          ...layerStyle(0.25)
        }}
      />

      {/* LAYER 3 - Middle element (clouds, mountains, etc) */}
      {midImage && (
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 bg-no-repeat bg-bottom bg-cover"
          style={{
            backgroundImage: `url(${midImage})`,
            ...layerStyle(0.4)
          }}
        />
      )}

      {/* LAYER 4 - Floating decorative text (ex: "ADVENTURE" en énorme à l'arrière) */}
      {floatingText && (
        <div
          className="absolute inset-x-0 top-1/3 text-center pointer-events-none select-none"
          style={layerStyle(0.5)}
        >
          <h2
            className="font-display font-black tracking-tighter text-white/10"
            style={{ fontSize: 'clamp(80px, 18vw, 280px)', lineHeight: 0.9 }}
          >
            {floatingText}
          </h2>
        </div>
      )}

      {/* LAYER 5 - Title + subtitle + CTA (scroll un peu plus rapidement = sortent en premier) */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center px-6"
        style={{ height: '100%', ...layerStyle(0.7) }}
      >
        <h1
          className="font-display font-black text-white tracking-tight drop-shadow-2xl"
          style={{
            fontSize: 'clamp(48px, 9vw, 144px)',
            lineHeight: 1,
            textShadow: '0 4px 24px rgba(0,0,0,0.4)'
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-6 max-w-2xl text-white/90 font-light"
            style={{
              fontSize: 'clamp(16px, 1.6vw, 24px)',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)'
            }}
          >
            {subtitle}
          </p>
        )}
        {ctaLabel && (
          <a
            href={ctaHref || '#'}
            className="mt-8 inline-flex items-center gap-2 bg-white/95 hover:bg-white text-zinc-900 font-bold px-7 py-3.5 rounded-full text-sm uppercase tracking-widest shadow-2xl hover:shadow-fuchsia-500/40 transition-all hover:scale-105"
          >
            {ctaLabel}
            <span className="text-base">→</span>
          </a>
        )}
      </div>

      {/* LAYER 6 - Foreground silhouette (le plus rapide = au premier plan) */}
      {fgImage && (
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 bg-no-repeat bg-bottom bg-contain pointer-events-none"
          style={{
            backgroundImage: `url(${fgImage})`,
            ...layerStyle(0.95)
          }}
        />
      )}

      {/* Overlay sombre global */}
      {overlayColor && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: overlayColor }}
        />
      )}

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-white/70 text-xs uppercase tracking-widest pointer-events-none">
        <span>Scroll</span>
        <div className="w-px h-8 bg-white/40 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-2 bg-white animate-[scrollHint_2s_ease-in-out_infinite]" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `@keyframes scrollHint { 0% { transform: translateY(-100%) } 100% { transform: translateY(400%) } }`
      }} />
    </section>
  );
}
