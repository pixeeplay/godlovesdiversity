import Link from 'next/link';
import { MapPin } from 'lucide-react';

const CITIES = [
  { slug: 'paris',     name: 'Paris',     emoji: '🇫🇷' },
  { slug: 'lyon',      name: 'Lyon',      emoji: '🇫🇷' },
  { slug: 'bruxelles', name: 'Bruxelles', emoji: '🇧🇪' },
  { slug: 'montreal',  name: 'Montréal',  emoji: '🇨🇦' },
  { slug: 'berlin',    name: 'Berlin',    emoji: '🇩🇪' },
  { slug: 'nyc',       name: 'New York',  emoji: '🇺🇸' }
];

export const metadata = { title: 'GLD Local — par ville' };

export default function P() {
  return (
    <main className="container-wide py-12 max-w-4xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-cyan-500 to-fuchsia-600 rounded-2xl p-3 mb-3"><MapPin size={28} className="text-white" /></div>
        <h1 className="font-display font-bold text-4xl">🌆 GLD Local</h1>
        <p className="text-zinc-400 text-sm mt-2">Pages dédiées par ville : lieux, events, hotline, coordinateur·rice locale.</p>
      </header>
      <div className="grid sm:grid-cols-3 gap-3">
        {CITIES.map(c => (
          <Link key={c.slug} href={`/gld-local/${c.slug}`} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl p-4 text-center">
            <div className="text-4xl mb-2">{c.emoji}</div>
            <div className="font-bold text-base">{c.name}</div>
          </Link>
        ))}
      </div>
      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
        <p className="text-sm text-zinc-300">Ta ville n'est pas listée ?</p>
        <Link href="/contact?sujet=Ouvrir+GLD+dans+ma+ville" className="inline-block mt-2 bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-full">Ouvrir GLD dans ma ville</Link>
      </div>
    </main>
  );
}
