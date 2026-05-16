import { NeonHeart } from '@/components/NeonHeart';
import { SacredSkyline } from '@/components/SacredSkyline';
import { ArrowRight } from 'lucide-react';

/**
 * GLD V1 — Hero Section FIXE (anti carrousel)
 * Message stable, immédiatement visible, padding généreux.
 */
export function HeroFixed({
  eyebrow,
  title,
  subtitle,
  ctaText,
  ctaUrl,
  ctaSecondaryText,
  ctaSecondaryUrl,
  accentColor,
  logoUrl,
  mediaUrl,
  mediaType
}: {
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  ctaSecondaryText?: string | null;
  ctaSecondaryUrl?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
}) {
  const hasMedia = !!mediaUrl;
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: 'var(--hero-bg, #0a0314)' }}
    >
      <SacredSkyline height={780} />
      {hasMedia && (
        <div className="absolute inset-0">
          {mediaType === 'video' ? (
            <video src={mediaUrl!} muted autoPlay loop playsInline className="w-full h-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl!} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/35" />
        </div>
      )}

      <div className="relative z-10">
        <div className={`container-wide grid gap-12 items-center min-h-[780px] py-32 md:py-48 ${hasMedia ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
          {!hasMedia && (
            <div className="flex justify-center lg:justify-start">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="max-h-80 object-contain heart-glow" />
              ) : (
                <NeonHeart size={340} />
              )}
            </div>
          )}
          <div className={hasMedia ? 'max-w-3xl' : ''}>
            {eyebrow && (
              <p className="text-xs uppercase tracking-[0.45em] mb-6" style={{ color: accentColor || '#FF2BB1' }}>
                {eyebrow}
              </p>
            )}
            <h1
              className="font-display font-black leading-[0.9] tracking-tight neon-title"
              style={{ fontSize: 'clamp(2.75rem, 7vw, 6rem)' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="mt-8 text-lg md:text-xl text-white/85 max-w-xl leading-relaxed">
                {subtitle}
              </p>
            )}
            {(ctaText && ctaUrl) || (ctaSecondaryText && ctaSecondaryUrl) ? (
              <div className="mt-10 flex flex-wrap gap-4">
                {ctaText && ctaUrl && (
                  <a href={ctaUrl} className="gld-cta-primary">
                    {ctaText} <ArrowRight size={14} />
                  </a>
                )}
                {ctaSecondaryText && ctaSecondaryUrl && (
                  <a href={ctaSecondaryUrl} className="gld-cta-secondary">
                    {ctaSecondaryText}
                  </a>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
