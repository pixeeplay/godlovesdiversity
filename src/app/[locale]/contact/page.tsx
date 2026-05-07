import { setRequestLocale } from 'next-intl/server';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <article className="container-tight py-20 prose prose-invert max-w-3xl">
      <h1 className="font-display text-4xl">Contact</h1>
      <p>Une question, un partenariat, un témoignage ?</p>
      <p><a className="text-brand-pink" href="mailto:hello@parislgbt.com">hello@parislgbt.com</a></p>
    </article>
  );
}
