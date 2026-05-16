import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GLD V1 — /qui-sommes-nous
 * Storytelling, paragraphes aérés, max-width 720px.
 * Frise / portraits à compléter plus tard via CMS.
 */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <section className="py-24 md:py-32 border-b border-[color:var(--border)]" style={{ background: 'var(--hero-bg, #0a0314)' }}>
        <div className="container-tight text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-brand-pink mb-6">Qui sommes-nous ?</p>
          <h1 className="font-display font-black tracking-tight neon-title leading-[0.95]"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
            Un mouvement, des visages.
          </h1>
        </div>
      </section>

      <article className="py-24 md:py-32" style={{ background: 'var(--bg)' }}>
        <div className="mx-auto px-6" style={{ maxWidth: '720px' }}>
          <div className="space-y-10 text-lg leading-relaxed text-white/85">
            <p>
              <strong className="text-white">God Loves Diversity</strong> est né d'une conviction simple :
              l'amour est universel, et la foi peut être inclusive.
            </p>
            <p>
              Nous sommes un collectif citoyen, interreligieux et international.
              Des croyant·es, des chercheur·euses de sens, des allié·es — uni·es par
              la volonté de rendre visible une autre lecture des textes : celle de
              l'amour, de la justice et de la compassion.
            </p>
            <p>
              Notre mouvement repose sur trois piliers : <strong>partager</strong> des images
              et des récits qui changent le regard, <strong>construire</strong> une communauté
              chaleureuse et sûre, et <strong>diffuser</strong> des ressources pour celles et
              ceux qui en ont besoin — partout sur la planète.
            </p>
            <p>
              Ce que tu vois ici est le travail de bénévoles, de partenaires, et de chaque
              personne qui partage une photo, un témoignage ou simplement le message.
              Aucune institution, aucune affiliation politique : juste l'amour comme boussole.
            </p>
            <p>
              Tu veux nous rejoindre, contribuer ou nous écrire ?
              <br />
              <a href="mailto:hello@godlovesdiversity.com" className="text-brand-pink underline-offset-4 hover:underline">
                hello@godlovesdiversity.com
              </a>
            </p>
          </div>

          {/* Frise / portraits placeholder — sera remplie via CMS plus tard */}
          <div className="mt-20 pt-12 border-t border-[color:var(--border)]">
            <p className="text-xs uppercase tracking-[0.4em] text-brand-pink mb-6 text-center">L'équipe & les voix</p>
            <p className="text-center text-white/50 italic text-sm">
              Portraits et récits à venir.
            </p>
          </div>
        </div>
      </article>
    </>
  );
}
