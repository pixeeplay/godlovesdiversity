import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { FLAGS, IDENTITY_GLOSSARY } from '@/lib/identity-flags';

export default function IdentitesPage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const t = useTranslations('identites');
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">{t('title')}</h1>
      <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mb-12">{t('subtitle')}</p>
      <p className="italic mb-10 opacity-80">{t('intro')}</p>
      <h2 className="text-2xl font-bold mb-6">{t('flags')} & {t('glossary')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {IDENTITY_GLOSSARY.map(id => (
          <article key={id.slug} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex gap-4">
            <span className="block w-16 h-10 shrink-0 rounded shadow-inner" dangerouslySetInnerHTML={{ __html: FLAGS[id.flag] }} />
            <div>
              <h3 className="text-xl font-bold mb-2">{id.labelFr}</h3>
              <p className="text-sm opacity-80 leading-relaxed">{id.description}</p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
