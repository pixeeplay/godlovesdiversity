'use client';
import Link from 'next/link';
import { Layout, ChevronRight } from 'lucide-react';

const PAGES = [
  { slug: 'home',              label: 'Accueil',          desc: 'Hero, manifesto, sections principales' },
  { slug: 'message',           label: 'Le message',       desc: 'Manifeste GLD' },
  { slug: 'argumentaire',      label: 'Argumentaire',     desc: 'Quatre vérités simples' },
  { slug: 'membre-plus',       label: 'Membre+ Premium',  desc: 'Page abonnement' },
  { slug: 'about',             label: 'À propos',         desc: 'Qui sommes-nous' },
  { slug: 'cercles-priere',    label: 'Cercles de prière', desc: 'Page spirituelle' },
  { slug: 'champ-de-priere',   label: 'Champ de prières',  desc: 'Carte mondiale' },
  { slug: 'camino',            label: 'Camino virtuel',    desc: 'Pèlerinage gamifié' },
  { slug: 'webcams-live',      label: 'Webcams live',      desc: 'Lieux saints en direct' },
  { slug: 'journal',           label: 'Journal vocal',     desc: 'Prières vocales' },
  { slug: 'crowdfunding',      label: 'Crowdfunding',      desc: 'Page collecte' },
  { slug: 'partager',          label: 'Carte de partage',  desc: 'Page sharing' }
];

export function PageBuilderHome() {
  return (
    <div className="px-3 lg:px-4 pb-6 max-w-5xl mx-auto">
      <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl p-4 mb-4 text-xs text-fuchsia-200/90">
        <p className="font-bold mb-1">🎨 Page Builder visuel</p>
        <p>Édite visuellement les pages publiques avec drag &amp; drop. Choisis une page ci-dessous pour ouvrir l'éditeur.</p>
        <p className="text-[10px] text-fuchsia-300/70 mt-2">
          ⚠️ Les blocs créés ici s'affichent <strong>en plus</strong> du contenu Next.js existant (pas en remplacement) via le composant <code className="bg-fuchsia-950/50 px-1 rounded">&lt;PageBlocksRenderer pageSlug="..."/&gt;</code> à insérer dans la page server.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {PAGES.map((p) => (
          <Link
            key={p.slug}
            href={`/admin/page-builder/${p.slug}`}
            className="group bg-zinc-900 hover:bg-zinc-800/50 ring-1 ring-zinc-800 hover:ring-fuchsia-500/50 rounded-2xl p-4 flex items-center gap-3 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 flex items-center justify-center shrink-0 group-hover:from-fuchsia-500 group-hover:to-violet-500 transition">
              <Layout size={18} className="text-fuchsia-300 group-hover:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm">{p.label}</h3>
              <p className="text-[11px] text-zinc-500">{p.desc}</p>
              <code className="text-[10px] text-zinc-600">/{p.slug}</code>
            </div>
            <ChevronRight size={16} className="text-zinc-500 group-hover:text-fuchsia-300 transition" />
          </Link>
        ))}
      </div>
    </div>
  );
}
