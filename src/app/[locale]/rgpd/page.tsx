import { setRequestLocale } from 'next-intl/server';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <article className="container-tight py-20 prose prose-invert max-w-3xl">
      <h1 className="font-display text-4xl">RGPD & confidentialité</h1>
      <p>Vos données ne sont jamais revendues. Géolocalisation arrondie au km.</p>
      <p>Vous pouvez demander la suppression complète de vos données à tout moment :
        <a className="text-brand-pink" href="mailto:rgpd@parislgbt.com"> rgpd@parislgbt.com</a>
      </p>
    </article>
  );
}
