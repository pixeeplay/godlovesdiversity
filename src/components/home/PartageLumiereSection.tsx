import { Download, Sparkles } from 'lucide-react';

type PhotoItem = {
  id: string;
  url: string;
  caption?: string | null;
  author?: string | null;
};

/**
 * GLD V1 — Zone 2 : Présentation projet "Partage ta lumière"
 * Texte + grille photo communauté (12 vignettes) + 2 CTAs hiérarchisés.
 */
export function PartageLumiereSection({
  photos,
  participateHref,
  posterHref = '/posters/gld-A3.pdf'
}: {
  photos: PhotoItem[];
  participateHref: string;
  posterHref?: string;
}) {
  return (
    <section className="py-24 md:py-32 border-t border-[color:var(--border)]" style={{ background: 'var(--bg)' }}>
      <div className="container-wide grid lg:grid-cols-2 gap-16 items-center">
        {/* Texte + CTAs */}
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.4em] text-brand-pink mb-5">Partage ta lumière</p>
          <h2 className="font-display text-4xl md:text-5xl font-black leading-[1.05] tracking-tight">
            Rejoins le mouvement.<br />Sois la lumière.
          </h2>
          <p className="mt-7 text-white/75 text-lg leading-relaxed">
            Imprime l'affiche, prends-toi en photo devant un lieu qui compte pour toi,
            et partage ton image. Chaque photo est un acte d'amour, un signe visible
            que la diversité a toute sa place — partout dans le monde.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href={participateHref} className="gld-cta-primary">
              <Sparkles size={14} /> Je partage ma lumière
            </a>
            <a href={posterHref} className="gld-cta-secondary" download>
              <Download size={14} /> Voir / télécharger l'affiche
            </a>
          </div>
        </div>

        {/* Grille photo communauté — 12 vignettes */}
        <div>
          {photos.length === 0 ? (
            <div className="aspect-square rounded-2xl border border-dashed border-[color:var(--border)] flex items-center justify-center text-white/40 text-sm italic">
              Les premières photos arrivent bientôt…
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
              {photos.slice(0, 12).map((p) => (
                <div
                  key={p.id}
                  className="aspect-square overflow-hidden rounded-xl bg-black/30 border border-white/5 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.caption || p.author || ''}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
