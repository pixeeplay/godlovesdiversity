'use client';
import { useEffect, useRef, useState, CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Parallax Slider artistique — inspired by https://dribbble.com/shots/19640158
 * (Artistic Parallax Slider for Wordpress).
 *
 * Slider horizontal avec effet de profondeur multi-layers : titre, subtitle,
 * image, bg, color overlay glissent à des vitesses différentes pendant la
 * transition entre slides → effet "cinéma".
 *
 * Usage :
 *   <ParallaxSlider slides={[
 *     { title: 'Foi', subtitle: 'Communauté', image: '/img/1.jpg', tagline: '01 / 03' },
 *     { title: 'Inclusion', subtitle: 'Tous bienvenus', image: '/img/2.jpg', tagline: '02 / 03' },
 *   ]} />
 */

export interface ParallaxSlide {
  title: string;
  subtitle?: string;
  tagline?: string;
  image: string;
  ctaLabel?: string;
  ctaHref?: string;
  bgColor?: string; // e.g. '#1e1b4b'
  accentColor?: string; // e.g. '#d946ef'
}

export interface ParallaxSliderProps {
  slides: ParallaxSlide[];
  height?: string;
  autoplay?: boolean;
  autoplayDelay?: number;
  className?: string;
}

export function ParallaxSlider({
  slides,
  height = '85vh',
  autoplay = true,
  autoplayDelay = 6500,
  className = ''
}: ParallaxSliderProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<number | null>(null);

  const total = slides.length;

  function go(next: number) {
    if (animating) return;
    const dir = next > current ? 1 : -1;
    setDirection(dir);
    setAnimating(true);
    setCurrent((next + total) % total);
    setTimeout(() => setAnimating(false), 1100);
  }

  useEffect(() => {
    if (!autoplay || total <= 1) return;
    timerRef.current = window.setTimeout(() => go(current + 1), autoplayDelay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, autoplay, total]);

  if (total === 0) return null;

  return (
    <section
      className={`relative w-full overflow-hidden bg-zinc-950 ${className}`}
      style={{ height }}
    >
      {slides.map((slide, idx) => {
        const isActive = idx === current;
        const isPrev = (idx === current - 1) || (current === 0 && idx === total - 1);
        const isNext = (idx === current + 1) || (current === total - 1 && idx === 0);
        const visible = isActive || isPrev || isNext;
        if (!visible) return null;

        // État de la slide : 'enter' (en cours d'arrivée), 'leave' (en train de partir), 'idle'
        let state: 'enter' | 'leave' | 'idle' = 'idle';
        if (isActive) state = 'enter';
        else if (animating) state = 'leave';

        return (
          <SlideLayer
            key={idx}
            slide={slide}
            state={state}
            direction={direction}
            isActive={isActive}
          />
        );
      })}

      {/* Controls */}
      {total > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-between px-6 md:px-12">
          <div className="flex items-center gap-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`h-1 rounded-full transition-all ${
                  i === current ? 'w-12 bg-white' : 'w-6 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => go(current - 1)}
              className="w-12 h-12 rounded-full border border-white/30 hover:border-white text-white/80 hover:text-white flex items-center justify-center transition"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => go(current + 1)}
              className="w-12 h-12 rounded-full border border-white/30 hover:border-white text-white/80 hover:text-white flex items-center justify-center transition"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Progress bar autoplay */}
      {autoplay && total > 1 && (
        <div
          key={current}
          className="absolute top-0 left-0 h-0.5 bg-white/80 z-30"
          style={{
            animation: `gldSliderProgress ${autoplayDelay}ms linear forwards`
          }}
        />
      )}
      <style dangerouslySetInnerHTML={{
        __html: `@keyframes gldSliderProgress { from { width: 0% } to { width: 100% } }`
      }} />
    </section>
  );
}

function SlideLayer({
  slide,
  state,
  direction,
  isActive
}: {
  slide: ParallaxSlide;
  state: 'enter' | 'leave' | 'idle';
  direction: 1 | -1;
  isActive: boolean;
}) {
  const accent = slide.accentColor || '#d946ef';

  // Layer-specific transforms based on state
  const bgX = state === 'leave' ? `${-direction * 30}%` : state === 'enter' ? '0%' : `${direction * 30}%`;
  const imageX = state === 'leave' ? `${-direction * 60}%` : state === 'enter' ? '0%' : `${direction * 60}%`;
  const titleX = state === 'leave' ? `${-direction * 100}%` : state === 'enter' ? '0%' : `${direction * 100}%`;
  const subtitleX = state === 'leave' ? `${-direction * 80}%` : state === 'enter' ? '0%' : `${direction * 80}%`;
  const taglineX = state === 'leave' ? `${-direction * 40}%` : state === 'enter' ? '0%' : `${direction * 40}%`;

  const opacity = state === 'idle' ? 0 : 1;
  const baseTransition = 'transform 1s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.6s ease-out';

  return (
    <div
      className="absolute inset-0"
      style={{ pointerEvents: isActive ? 'auto' : 'none', opacity, transition: 'opacity .6s' }}
    >
      {/* Layer 1 - Background color/gradient (scrolls slowest) */}
      <div
        className="absolute inset-0"
        style={{
          background: slide.bgColor || `linear-gradient(135deg, ${accent}, #0a0a0f 70%)`,
          transform: `translateX(${bgX})`,
          transition: baseTransition
        }}
      />

      {/* Layer 2 - Tagline number (top-left) */}
      {slide.tagline && (
        <div
          className="absolute top-8 md:top-12 left-6 md:left-12 z-10 text-white/60 font-mono text-xs uppercase tracking-[0.4em]"
          style={{
            transform: `translateX(${taglineX})`,
            transition: baseTransition
          }}
        >
          {slide.tagline}
        </div>
      )}

      {/* Layer 3 - Image (right side, large) */}
      <div
        className="absolute right-0 top-0 bottom-0 w-[60%] md:w-[55%] bg-no-repeat bg-cover bg-center"
        style={{
          backgroundImage: `url(${slide.image})`,
          clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)',
          transform: `translateX(${imageX})`,
          transition: baseTransition
        }}
      />

      {/* Layer 4 - Big background title (decorative, behind real title) */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center select-none"
        style={{
          transform: `translateX(${titleX})`,
          transition: baseTransition
        }}
      >
        <h2
          className="font-display font-black tracking-tighter text-white/[0.05]"
          style={{ fontSize: 'clamp(120px, 22vw, 360px)', lineHeight: 0.9, whiteSpace: 'nowrap' }}
        >
          {slide.title}
        </h2>
      </div>

      {/* Layer 5 - Real title + subtitle + CTA (left side, medium speed) */}
      <div
        className="absolute inset-y-0 left-6 md:left-16 z-20 w-full md:w-1/2 flex flex-col justify-center"
        style={{
          transform: `translateX(${titleX})`,
          transition: baseTransition
        }}
      >
        {slide.subtitle && (
          <div
            className="mb-4 inline-flex w-fit items-center gap-2 text-xs uppercase tracking-[0.4em] font-bold"
            style={{
              color: accent,
              transform: `translateX(${subtitleX})`,
              transition: baseTransition
            }}
          >
            <span className="block w-8 h-px" style={{ background: accent }} />
            {slide.subtitle}
          </div>
        )}
        <h1
          className="font-display font-black text-white leading-[0.95] drop-shadow-2xl"
          style={{
            fontSize: 'clamp(56px, 9vw, 160px)',
            textShadow: '0 4px 32px rgba(0,0,0,0.5)'
          }}
        >
          {slide.title}
        </h1>
        {slide.ctaLabel && (
          <a
            href={slide.ctaHref || '#'}
            className="mt-8 inline-flex w-fit items-center gap-3 text-white font-bold uppercase tracking-widest text-xs border-b-2 border-white/40 hover:border-white pb-2 pr-8 transition-all"
          >
            {slide.ctaLabel}
            <span style={{ color: accent }}>→</span>
          </a>
        )}
      </div>
    </div>
  );
}
