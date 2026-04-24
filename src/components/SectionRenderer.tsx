/**
 * Rend une section riche selon son layout :
 * - banner : centré, gros titre, subtitle en pré-titre
 * - text-image : 2 colonnes (texte gauche, image/vidéo droite)
 * - image-text : 2 colonnes (image/vidéo gauche, texte droite)
 * - full-image : image full-width avec texte en overlay
 * - text-only : texte centré max-w-3xl
 * - quote : citation centrée italique
 */

type SectionItem = {
  id: string;
  layout: string;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  accentColor?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
};

function Media({ url, type, className }: { url: string; type: string | null | undefined; className?: string }) {
  if (type === 'video') {
    return <video src={url} controls className={className} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={className} />;
}

function TextBlock({ s, align = 'left' }: { s: SectionItem; align?: 'left' | 'center' }) {
  return (
    <div className={align === 'center' ? 'text-center' : ''}>
      {s.subtitle && (
        <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: s.accentColor || '#FF2BB1' }}>
          {s.subtitle}
        </p>
      )}
      {s.title && (
        <h2 className="font-display text-3xl md:text-5xl font-black mb-5 leading-tight">{s.title}</h2>
      )}
      {s.body && (
        <p className="text-lg text-white/80 leading-relaxed whitespace-pre-line">{s.body}</p>
      )}
      {s.ctaText && s.ctaUrl && (
        <a
          href={s.ctaUrl}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-bold uppercase text-xs tracking-widest text-white shadow-[0_0_30px_rgba(255,43,177,.4)] transition hover:opacity-90"
          style={{ background: s.accentColor || '#FF2BB1' }}
        >
          {s.ctaText}
        </a>
      )}
    </div>
  );
}

export function SectionRenderer({ section: s }: { section: SectionItem }) {
  if (s.layout === 'banner') {
    return (
      <section className="py-24 relative">
        <div className="absolute inset-0 -z-10 opacity-50"
             style={{ background: `radial-gradient(600px 400px at 50% 50%, ${s.accentColor || '#FF2BB1'}26, transparent 70%)` }} />
        <div className="container-tight"><TextBlock s={s} align="center" /></div>
      </section>
    );
  }

  if (s.layout === 'quote') {
    return (
      <section className="py-20">
        <div className="container-tight text-center">
          <div
            className="relative inline-block px-8 py-6 rounded-2xl"
            style={{ background: `${s.accentColor || '#FF2BB1'}1A`, border: `1px solid ${s.accentColor || '#FF2BB1'}40` }}
          >
            <p className="font-display text-2xl md:text-3xl italic leading-snug max-w-2xl">
              {s.body}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (s.layout === 'text-only') {
    return (
      <section className="py-16">
        <div className="container-tight max-w-3xl"><TextBlock s={s} /></div>
      </section>
    );
  }

  if (s.layout === 'full-image' && s.mediaUrl) {
    return (
      <section className="relative py-32">
        <div className="absolute inset-0 -z-10">
          <Media url={s.mediaUrl} type={s.mediaType} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="container-tight"><TextBlock s={s} align="center" /></div>
      </section>
    );
  }

  // text-image (default) ou image-text
  const isReverse = s.layout === 'image-text';
  return (
    <section className="py-16">
      <div className="container-wide grid lg:grid-cols-2 gap-10 items-center">
        <div className={isReverse ? 'lg:order-2' : ''}><TextBlock s={s} /></div>
        <div className={isReverse ? 'lg:order-1' : ''}>
          {s.mediaUrl ? (
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
              <Media url={s.mediaUrl} type={s.mediaType} className="w-full max-h-[480px] object-cover" />
            </div>
          ) : (
            <div className="rounded-2xl aspect-video flex items-center justify-center"
                 style={{ background: `linear-gradient(135deg, ${s.accentColor || '#FF2BB1'}33, transparent)` }}>
              <span className="text-6xl opacity-50">✨</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
