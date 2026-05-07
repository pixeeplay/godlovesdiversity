import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { getScope } from '@/lib/scope';
import { FLAGS } from '@/lib/identity-flags';

export default function PridePage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const t = useTranslations('pride');
  const scope = getScope();

  // Marches officielles 2026 — seed data, will be loaded from DB Event later
  const marches2026 = [
    { city: 'Paris',     date: '2026-06-27', name: 'Marche des Fiertés Paris',         scope: 'paris,france' },
    { city: 'Marseille', date: '2026-07-04', name: 'Pride Marseille',                  scope: 'france' },
    { city: 'Lyon',      date: '2026-06-13', name: 'Marche des Fiertés Lyon',          scope: 'france' },
    { city: 'Toulouse',  date: '2026-06-06', name: 'Marche des Fiertés Toulouse',      scope: 'france' },
    { city: 'Lille',     date: '2026-05-30', name: 'Marche des Fiertés Lille',         scope: 'france' },
    { city: 'Nantes',    date: '2026-06-20', name: 'Marche des Fiertés Nantes',        scope: 'france' },
    { city: 'Bordeaux',  date: '2026-06-06', name: 'Marche des Fiertés Bordeaux',      scope: 'france' },
    { city: 'Strasbourg',date: '2026-06-13', name: 'Festigays — Pride Strasbourg',     scope: 'france' },
    { city: 'Montpellier',date:'2026-07-11', name: 'Pride Montpellier',                scope: 'france' },
    { city: 'Rennes',    date: '2026-06-06', name: 'Pride Rennes',                     scope: 'france' }
  ];
  const visible = scope === 'paris' ? marches2026.filter(m => m.scope.includes('paris')) : marches2026;

  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-12">
        <span className="inline-block w-12 h-7 mr-3 align-middle" dangerouslySetInnerHTML={{ __html: FLAGS.progress }} />
        <h1 className="inline align-middle text-5xl md:text-6xl font-black tracking-tight">{t('title')}</h1>
        <p className="mt-6 text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl">{t('subtitle')}</p>
      </div>
      <section>
        <h2 className="text-2xl font-bold mb-6">{t('official_marches')} 2026</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map(m => (
            <article key={m.city} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition">
              <div className="text-xs uppercase tracking-widest opacity-60 mb-2">{m.city}</div>
              <h3 className="text-xl font-bold mb-2">{m.name}</h3>
              <p className="text-sm opacity-70">{new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
