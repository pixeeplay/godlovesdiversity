import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <View />;
}

function View() {
  const t = useTranslations('about');
  return (
    <section className="container-tight py-20 prose prose-invert max-w-3xl">
      <h1 className="font-display text-5xl font-black gradient-text">{t('title')}</h1>
      <p className="text-xl text-white/80 mt-6">{t('intro')}</p>
      <hr className="border-white/10 my-10" />
      <p className="text-white/70">
        Le mouvement est porté par des bénévoles, croyants et non-croyants, partout dans le monde.
        Pour rejoindre l'équipe, écrire à <a className="text-brand-pink" href="mailto:hello@godlovesdiversity.com">hello@godlovesdiversity.com</a>.
      </p>
    </section>
  );
}
