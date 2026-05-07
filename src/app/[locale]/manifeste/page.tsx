import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { FLAGS } from '@/lib/identity-flags';

export default function ManifestePage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const t = useTranslations('manifeste');
  const pillars = [
    { k: 'p1', title: t('p1_title'), text: t('p1_text') },
    { k: 'p2', title: t('p2_title'), text: t('p2_text') },
    { k: 'p3', title: t('p3_title'), text: t('p3_text') },
    { k: 'p4', title: t('p4_title'), text: t('p4_text') },
    { k: 'p5', title: t('p5_title'), text: t('p5_text') }
  ];
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-12 flex items-center gap-4">
        <span className="block w-16 h-10" dangerouslySetInnerHTML={{ __html: FLAGS.progress }} />
        <h1 className="text-5xl md:text-6xl font-black tracking-tight">{t('title')}</h1>
      </div>
      <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-12">{t('subtitle')}</p>
      <div className="space-y-10">
        {pillars.map((p, i) => (
          <section key={p.k} className="border-l-4 border-current pl-6 py-2">
            <div className="text-xs uppercase tracking-widest opacity-60 mb-2">{`${i + 1}/${pillars.length}`}</div>
            <h2 className="text-2xl font-bold mb-3">{p.title}</h2>
            <p className="text-lg leading-relaxed opacity-90">{p.text}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
