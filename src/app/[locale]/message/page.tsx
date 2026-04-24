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
    <article className="container-tight py-20 prose prose-invert max-w-3xl">
      <h1 className="font-display text-5xl font-black gradient-text">{t('manifesto_title')}</h1>
      <p className="text-xl text-white/80 mt-6">{t('manifesto_text')}</p>
      <hr className="border-white/10 my-10" />
      <p className="text-white/70 leading-relaxed">
        Ce site est un appel à la lecture inclusive des textes sacrés. Il ne combat aucune religion :
        il propose simplement de redonner aux croyants LGBT la place qui leur a toujours été promise
        par les principes fondateurs des grandes traditions monothéistes — l'amour, la justice et la dignité.
      </p>
    </article>
  );
}
