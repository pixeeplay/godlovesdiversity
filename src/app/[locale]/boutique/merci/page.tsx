import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Merci pour ta commande !' };

export default function ThankYou() {
  return (
    <main className="min-h-screen flex items-center justify-center py-20">
      <div className="container-tight text-center">
        <CheckCircle2 className="text-emerald-400 mx-auto mb-4" size={72} />
        <h1 className="text-4xl font-display font-black gradient-text mb-3">Merci 🌈</h1>
        <p className="text-white/80 text-lg max-w-xl mx-auto mb-6">
          Ta commande a bien été enregistrée. Tu vas recevoir un email de confirmation
          dans les prochaines minutes. Merci de soutenir le mouvement !
        </p>
        <Link href="/boutique" className="inline-block bg-brand-pink hover:bg-pink-600 text-white font-bold px-6 py-3 rounded-full">
          Continuer mes achats
        </Link>
      </div>
    </main>
  );
}
