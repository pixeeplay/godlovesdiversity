import Link from 'next/link';
import { Heart } from 'lucide-react';

const CERCLES = [
  { tradition: '✝️ Catholique inclusif',  day: 'Mardi', time: '20h CET',  hosts: 'David & Jonathan',          url: 'https://www.davidetjonathan.com' },
  { tradition: '✝️ Protestant inclusif',  day: 'Jeudi', time: '20h CET',  hosts: 'Carrefour des Chrétiens Inclusifs (CCI)', url: 'https://www.carrefour-cci.org' },
  { tradition: '☪️ Musulman·e LGBT',     day: 'Vendredi', time: '21h CET', hosts: 'HM2F (Homosexuel·les Musulman·es de France)', url: 'https://hm2f.org' },
  { tradition: '✡️ Juif·ves LGBT',       day: 'Vendredi soir', time: 'avant Shabbat', hosts: 'Beit Haverim',  url: 'https://beit-haverim.com' },
  { tradition: '☸️ Bouddhiste·s LGBT',  day: 'Dimanche', time: '19h CET', hosts: 'Sangha Inclusive Européenne', url: '#' },
  { tradition: '🕉 Hindou·es LGBT',     day: 'Mercredi', time: '20h CET', hosts: 'Réseau Galva-108',          url: 'https://galva108.org' },
  { tradition: '🌍 Inter-religieux',     day: '1er dim. du mois', time: '17h CET', hosts: 'GLD',         url: '/contact' }
];

export const metadata = { title: 'Cercles de prière inclusifs — GLD' };

export default function P() {
  return (
    <main className="container-wide py-12 max-w-4xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-amber-500 to-rose-500 rounded-2xl p-3 mb-3"><Heart size={28} className="text-white" /></div>
        <h1 className="font-display font-bold text-4xl">Cercles de prière inclusifs</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-xl mx-auto">7 communautés spirituelles LGBT-friendly se retrouvent en ligne. Toutes sont gratuites et ouvertes.</p>
      </header>
      <div className="grid sm:grid-cols-2 gap-3">
        {CERCLES.map((c, i) => (
          <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl p-4 transition">
            <div className="font-bold text-base mb-1">{c.tradition}</div>
            <div className="text-xs text-zinc-400">📅 {c.day} · 🕒 {c.time}</div>
            <div className="text-[11px] text-fuchsia-400 mt-2">Hôte : {c.hosts} →</div>
          </a>
        ))}
      </div>
      <div className="mt-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-200 text-center">
        💡 Tu animes un cercle inclusif à ajouter ? <Link href="/contact" className="underline font-bold">Écris-nous</Link>.
      </div>
    </main>
  );
}
