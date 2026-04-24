import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Heart } from 'lucide-react';
import { NeonHeart } from '@/components/NeonHeart';

export default async function Page({
  params, searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ amount?: string; currency?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const amount = sp.amount ? Number(sp.amount) : null;

  return (
    <section className="container-tight py-32 text-center">
      <div className="mx-auto w-40 h-40 mb-8">
        <NeonHeart size={160} />
      </div>
      <h1 className="font-display text-5xl md:text-6xl font-black neon-title mb-6">
        MERCI <span className="text-brand-pink">❤</span>
      </h1>
      {amount && (
        <p className="text-white/80 text-xl mb-4">
          Votre don de <strong className="text-brand-pink">{amount} €</strong> a bien été reçu.
        </p>
      )}
      <p className="text-white/70 max-w-xl mx-auto leading-relaxed mb-10">
        Grâce à vous, le mouvement grandit. Nous pouvons imprimer plus d'affiches,
        les envoyer partout dans le monde, et faire entendre le message :
        <em className="text-brand-pink ml-1">Dieu aime la diversité.</em>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-primary uppercase text-xs tracking-widest">
          Retour à l'accueil
        </Link>
        <Link href="/galerie" className="btn-ghost uppercase text-xs tracking-widest">
          Voir les photos
        </Link>
        <Link href="/participer" className="btn-ghost uppercase text-xs tracking-widest">
          Partager une photo
        </Link>
      </div>
    </section>
  );
}
