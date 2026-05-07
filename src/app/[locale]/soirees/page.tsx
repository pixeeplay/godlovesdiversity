import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';

export default function SoireesPage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const t = useTranslations('soirees');
  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">{t('title')}</h1>
      <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mb-12">{t('subtitle')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a href="agenda?type=club" className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
          <span className="text-xs uppercase tracking-widest opacity-60">{t('tonight')}</span>
          <h3 className="text-xl font-bold mt-2">Voir les soirées de ce soir →</h3>
        </a>
        <a href="agenda?recurring=true" className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
          <span className="text-xs uppercase tracking-widest opacity-60">{t('recurring')}</span>
          <h3 className="text-xl font-bold mt-2">Soirées hebdo / mensuelles →</h3>
        </a>
      </div>
    </main>
  );
}
