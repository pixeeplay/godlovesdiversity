import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <View />;
}

function View() {
  const t = useTranslations('home');
  return (
    <article className="container-wide py-20">
      <h1 className="font-display text-5xl font-black gradient-text mb-12">
        {t('pillars_title')}
      </h1>
      <div className="space-y-10 max-w-4xl">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border-l-4 border-brand-pink pl-6">
            <div className="text-brand-pink font-display text-3xl mb-2">0{i}</div>
            <h2 className="text-2xl font-bold mb-3">{t(`pillar${i}_title` as any)}</h2>
            <p className="text-white/80 text-lg leading-relaxed">{t(`pillar${i}_text` as any)}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
