import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';

export default function SantePage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const t = useTranslations('sante');
  const sections = [
    { key: 'prep',      title: 'PrEP & TPE',         desc: 'Prévention pré-exposition + Traitement post-exposition VIH. Centres prescripteurs en France, prise en charge 100% par la Sécu.' },
    { key: 'depistage', title: 'Dépistage VIH/IST',  desc: 'CeGIDD gratuits, autotests, test rapides. Anonymes et confidentiels.' },
    { key: 'mental',    title: 'Santé mentale',      desc: 'Psychologues LGBT-friendly, lignes d\'écoute, ressources santé mentale queer.' },
    { key: 'trans',     title: 'Ressources trans',   desc: 'Médecins formés, THS, parcours administratif, soutien associatif (OUTrans, Acceptess-T...).' },
    { key: 'doctors',   title: 'Médecins formé·es', desc: 'Annuaire de médecins LGBT-friendly vérifiés. Recherche par ville et spécialité.' },
    { key: 'hotlines',  title: 'Hotlines & écoute',  desc: 'Ligne Azur (0 810 20 30 40), SOS Homophobie (01 48 06 42 41), AIDES (0 805 160 011)...' }
  ];
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">{t('title')}</h1>
      <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mb-12">{t('subtitle')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sections.map(s => (
          <article key={s.key} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <h3 className="text-xl font-bold mb-3">{s.title}</h3>
            <p className="text-sm opacity-80 leading-relaxed">{s.desc}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
