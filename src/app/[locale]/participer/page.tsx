import { setRequestLocale } from 'next-intl/server';
import { ParticipateForm } from '@/components/ParticipateForm';
import { useTranslations } from 'next-intl';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <View />;
}

function View() {
  const t = useTranslations('participate');
  return (
    <section className="container-tight py-20">
      <h1 className="font-display text-5xl font-black gradient-text">{t('title')}</h1>
      <p className="text-lg text-white/70 mt-4 mb-10">{t('subtitle')}</p>
      <ParticipateForm />
    </section>
  );
}
