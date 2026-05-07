import { setRequestLocale } from 'next-intl/server';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <article className="container-tight py-20 prose prose-invert max-w-3xl">
      <h1 className="font-display text-4xl">Mentions légales</h1>
      <p>Site édité par le mouvement <em>parislgbt</em>.</p>
      <p>Contact : <a className="text-brand-pink" href="mailto:hello@parislgbt.com">hello@parislgbt.com</a></p>
      <h2>Hébergement</h2>
      <p>Hébergé par votre infrastructure (Coolify).</p>
    </article>
  );
}
