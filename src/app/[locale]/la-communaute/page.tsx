import { setRequestLocale } from 'next-intl/server';
import { ArrowRight, Users, MessageCircle, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GLD V1 — /la-communaute
 * Placeholder propre : Hero + 3 sections génériques.
 * Le contenu définitif sera enrichi plus tard.
 */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const localePrefix = locale !== 'fr' ? `/${locale}` : '';

  const blocks = [
    {
      icon: Users,
      title: 'Une communauté mondiale',
      text: 'Des personnes croyantes, en chemin, ou simplement bienveillantes — partout dans le monde.',
      href: `${localePrefix}/galerie`,
      cta: 'Voir la galerie'
    },
    {
      icon: MessageCircle,
      title: 'Forum et témoignages',
      text: 'Partage ton histoire, lis celles des autres, trouve du soutien et inspire à ton tour.',
      href: `${localePrefix}/forum`,
      cta: 'Rejoindre le forum'
    },
    {
      icon: MapPin,
      title: 'Lieux et événements',
      text: 'Une carte vivante des lieux de culte inclusifs et des rendez-vous près de chez toi.',
      href: `${localePrefix}/agenda`,
      cta: 'Voir l\'agenda'
    }
  ];

  return (
    <>
      <section className="py-24 md:py-32 border-b border-[color:var(--border)]" style={{ background: 'var(--hero-bg, #0a0314)' }}>
        <div className="container-tight text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-brand-pink mb-6">La Communauté</p>
          <h1 className="font-display font-black tracking-tight neon-title leading-[0.95]"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
            On est plus fort·es ensemble.
          </h1>
          <p className="mt-8 text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            Une communauté ouverte, internationale, interreligieuse — où chacun·e
            peut partager, témoigner et se sentir vu·e.
          </p>
        </div>
      </section>

      <section className="py-24 md:py-32" style={{ background: 'var(--bg)' }}>
        <div className="container-wide grid md:grid-cols-3 gap-8">
          {blocks.map((b) => {
            const Icon = b.icon;
            return (
              <a
                key={b.title}
                href={b.href}
                className="block rounded-2xl border border-[color:var(--border)] hover:border-brand-pink/50 p-8 transition group"
              >
                <Icon className="text-brand-pink mb-5" size={36} strokeWidth={1.5} />
                <h2 className="font-display font-bold text-2xl mb-3 group-hover:text-brand-pink transition">{b.title}</h2>
                <p className="text-white/70 leading-relaxed mb-6">{b.text}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-pink">
                  {b.cta} <ArrowRight size={14} />
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </>
  );
}
