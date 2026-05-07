import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';

export default function AssosPage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const t = useTranslations('assos');
  const assos = [
    { name: 'Centre LGBTQI+ Paris-IDF',    city: 'Paris',     focus: 'Centre, écoute, ateliers' },
    { name: 'Inter-LGBT',                  city: 'Paris',     focus: 'Coordination, Marche des Fiertés' },
    { name: 'SOS Homophobie',              city: 'France',    focus: 'Lutte LGBTphobies, ligne d\'écoute' },
    { name: 'Acceptess-T',                 city: 'France',    focus: 'Soutien personnes trans' },
    { name: 'OUTrans',                     city: 'Paris',     focus: 'Permanences, accompagnement trans' },
    { name: 'AIDES',                       city: 'France',    focus: 'VIH, PrEP, dépistage, soutien' },
    { name: 'Le Refuge',                   city: 'France',    focus: 'Hébergement jeunes LGBT en rupture' },
    { name: 'Contact',                     city: 'France',    focus: 'Familles & ami·es de personnes LGBT' },
    { name: 'STOP Homophobie',             city: 'France',    focus: 'Veille, juridique, médiatique' },
    { name: 'Le Mag Jeunes LGBT+',         city: 'Paris',     focus: 'Jeunes LGBT+ 15-30 ans' }
  ];
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">{t('title')}</h1>
      <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mb-12">{t('subtitle')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assos.map(a => (
          <article key={a.name} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <h3 className="text-xl font-bold mb-2">{a.name}</h3>
            <p className="text-sm opacity-80">{a.focus} — <span className="opacity-60">{a.city}</span></p>
          </article>
        ))}
      </div>
    </main>
  );
}
