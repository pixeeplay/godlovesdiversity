import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Map, Sparkles, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Site map admin · parislgbt' };

interface RouteEntry {
  href: string;
  label: string;
  desc?: string;
  isNew?: boolean;        // tag NEW si récent
  isAdmin?: boolean;      // marque admin
  external?: boolean;
}

interface RouteGroup {
  id: string;
  label: string;
  emoji: string;
  color: string;
  routes: RouteEntry[];
}

const PUBLIC_GROUPS: RouteGroup[] = [
  {
    id: 'home', label: 'Accueil & vitrines', emoji: '🏠', color: '#ec4899',
    routes: [
      { href: '/', label: 'Accueil', desc: 'Hero + ticker dons + témoignages' },
      { href: '/argumentaire', label: 'Argumentaire', desc: 'Quatre vérités simples' },
      { href: '/message', label: 'Le message', desc: 'Manifeste parislgbt' },
      { href: '/affiches', label: 'Affiches PDF', desc: 'Imprime + diffuse' },
      { href: '/galerie', label: 'Galerie photos', desc: 'Photos communauté' },
      { href: '/temoignages', label: 'Témoignages vidéo' },
      { href: '/membre-plus', label: 'Membre+ Premium' }
    ]
  },
  {
    ]
  },
  {
    id: 'community', label: 'Communauté', emoji: '🤝', color: '#10b981',
    routes: [
      { href: '/lieux',           label: 'Lieux LGBTQ+', desc: '2700+ adresses · search · distance · route Waze multi-étapes', isNew: true },
      { href: '/forum',           label: 'Forum' },
      { href: '/agenda',          label: 'Agenda événements' },
      { href: '/connect',         label: 'Connect (réseau social)', desc: 'Communauté · Rencontres · Pro' },
      { href: '/mentor',          label: 'Mentor 1-1' },
      { href: '/urgence',         label: 'Page urgence', desc: '⚠️ Possible bug black screen' }
    ]
  },
  {
    id: 'shop', label: 'Boutique & Pro', emoji: '🛍', color: '#f59e0b',
    routes: [
      { href: '/boutique',                   label: 'Boutique' },
      { href: '/partager',                   label: 'Carte de partage' }
    ]
  },
  {
    id: 'me', label: 'Mon espace', emoji: '👤', color: '#3b82f6',
    routes: [
      { href: '/mon-espace',          label: 'Tableau de bord perso' },
      { href: '/mon-espace/profil',   label: 'Mon profil' },
      { href: '/mon-espace/lettres',  label: 'Lettres au futur' },
      { href: '/mon-espace/favoris',  label: 'Favoris' },
      { href: '/mon-espace/parametres', label: 'Paramètres' }
    ]
  },
  {
    id: 'reports', label: 'Rapports live', emoji: '📊', color: '#22d3ee',
    routes: [
      { href: '/rapport',                       label: 'Rapport live (stats prod)' },
      { href: '/api/rapport/audit',             label: 'Audit complet (77 modules)', isNew: true },
      { href: '/api/rapport/securite',          label: 'Rapport sécurité', isNew: true },
    ]
  }
];

const ADMIN_GROUPS: RouteGroup[] = [
  {
    id: 'dashboard', label: 'Tableau de bord', emoji: '📊', color: '#ec4899',
    routes: [
      { href: '/admin', label: 'Dashboard global', isAdmin: true },
      { href: '/admin/sitemap', label: 'Site map (cette page)', isAdmin: true, isNew: true }
    ]
  },
  {
    id: 'pro', label: 'Espace Pro', emoji: '🏪', color: '#10b981',
    routes: [
      { href: '/admin/pro',                label: 'Dashboard Pro', isAdmin: true },
      { href: '/admin/pro/venues',         label: 'Mes lieux (Pro)', isAdmin: true, isNew: true, desc: 'CRUD complet, IA enrich bulk, freshness' },
      { href: '/admin/pro/events',         label: 'Mes événements', isAdmin: true, desc: 'Bouton Enrichir agenda mondial 85 events', isNew: true },
      { href: '/admin/pro/import-events',  label: 'Import events Facebook', isAdmin: true },
      { href: '/admin/pro/ai-studio',      label: 'Studio IA Pro', isAdmin: true }
    ]
  },
  {
    id: 'content', label: 'Contenu', emoji: '🖼', color: '#a855f7',
    routes: [
      { href: '/admin/establishments', label: 'Établissements (CRUD)', isAdmin: true },
      { href: '/admin/venues',         label: 'Lieux LGBT-friendly', isAdmin: true },
      { href: '/admin/forum',          label: 'Forum (modération)', isAdmin: true },
      { href: '/admin/temoignages',    label: 'Témoignages vidéo', isAdmin: true },
      { href: '/admin/events',         label: 'Événements (agenda)', isAdmin: true },
      { href: '/admin/photos',         label: 'Photos (modération)', isAdmin: true },
      { href: '/admin/posters',        label: 'Affiches PDF', isAdmin: true },
      { href: '/admin/news',           label: 'Actualités', isAdmin: true },
      { href: '/admin/pages',          label: 'Pages riches', isAdmin: true },
      { href: '/admin/coupons',        label: 'Coupons & promos', isAdmin: true },
      { href: '/admin/banners',        label: 'Bannières (hero)', isAdmin: true },
      { href: '/admin/videos',         label: 'Vidéos YouTube', isAdmin: true }
    ]
  },
  {
    id: 'shop-admin', label: 'Boutique Admin', emoji: '🛍', color: '#f59e0b',
    routes: [
      { href: '/admin/shop',              label: 'Produits', isAdmin: true },
      { href: '/admin/shop/orders',       label: 'Commandes', isAdmin: true },
      { href: '/admin/shop/dropshipping', label: 'Dropshipping', isAdmin: true }
    ]
  },
  {
    id: 'comm', label: 'Communication', emoji: '📧', color: '#3b82f6',
    routes: [
      { href: '/admin/newsletter',          label: 'Newsletter', isAdmin: true, desc: 'Preview + test + schedule + listes', isNew: true },
      { href: '/admin/newsletter/plan',     label: 'Plan newsletter annuel', isAdmin: true },
      { href: '/admin/calendar',            label: 'Calendrier social', isAdmin: true },
      { href: '/admin/partners',            label: 'Partenaires', isAdmin: true },
      { href: '/admin/donate',              label: 'Dons & ticker', isAdmin: true }
    ]
  },
  {
    id: 'ia', label: 'IA & Outils', emoji: '✨', color: '#7c3aed',
    routes: [
      { href: '/admin/ai-studio',     label: 'Studio IA', isAdmin: true },
      { href: '/admin/ai-autopilot',  label: 'AI Autopilot', isAdmin: true },
      { href: '/admin/ai/knowledge',  label: 'Knowledge base RAG', isAdmin: true },
      { href: '/admin/manuals',       label: 'Manuels auto IA', isAdmin: true, isNew: true, desc: '3 audiences · 5499 mots · email auto' },
      { href: '/admin/avatar',        label: 'Avatar IA', isAdmin: true },
      { href: '/admin/telegram',      label: 'Bot Telegram', isAdmin: true }
    ]
  },
  {
    id: 'system', label: 'Système', emoji: '⚙️', color: '#71717a',
    routes: [
      { href: '/admin/users',         label: 'Utilisateurs', isAdmin: true },
      { href: '/admin/settings',      label: 'Paramètres', isAdmin: true },
      { href: '/admin/integrations',  label: 'Intégrations', isAdmin: true },
      { href: '/admin/themes',        label: 'Thèmes saisonniers', isAdmin: true },
      { href: '/admin/menu-permissions', label: 'Permissions menu', isAdmin: true },
      { href: '/admin/mail-setup',    label: 'Configuration mail', isAdmin: true }
    ]
  }
];

const SEEDS_TO_RUN: { label: string; method: string; url: string; description: string }[] = [
  { label: '✝️ Cron classify venues',        method: 'GET',  url: '/api/cron/classify-venues?limit=30',description: 'Reclassifie OTHER → CHURCH_CATHOLIC, MOSQUE, etc. (heuristique + Gemini)' }
];

export default async function AdminSitemapPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/sitemap');

  const role = (s.user as any)?.role || 'EDITOR';
  const isAdmin = role === 'ADMIN';

  const totalPublic = PUBLIC_GROUPS.reduce((acc, g) => acc + g.routes.length, 0);
  const totalAdmin = ADMIN_GROUPS.reduce((acc, g) => acc + g.routes.length, 0);
  const totalNew = [...PUBLIC_GROUPS, ...ADMIN_GROUPS].reduce(
    (acc, g) => acc + g.routes.filter(r => r.isNew).length, 0
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-500 rounded-2xl p-3 shadow-lg shadow-fuchsia-500/30">
          <Map size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold leading-none">Site map parislgbt</h1>
          <p className="text-zinc-400 text-xs mt-1">
            Toutes les pages publiques + admin avec tags ✨ <span className="text-fuchsia-300 font-bold">NEW</span> sur les ajouts récents.
          </p>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-300">{totalPublic}</div>
          <div className="text-[10px] uppercase text-zinc-500 mt-1">Pages publiques</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-fuchsia-300">{totalAdmin}</div>
          <div className="text-[10px] uppercase text-zinc-500 mt-1">Pages admin</div>
        </div>
        <div className="bg-zinc-900 border border-fuchsia-500/40 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-fuchsia-300 flex items-center justify-center gap-1.5"><Sparkles size={16} /> {totalNew}</div>
          <div className="text-[10px] uppercase text-fuchsia-200 mt-1 font-bold">Nouveautés ✨</div>
        </div>
      </section>

      {/* PUBLIC */}
      <section>
        <h2 className="text-xs uppercase font-bold tracking-widest text-emerald-400 mb-3 flex items-center gap-1.5">
          🌐 Front public ({totalPublic} routes)
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          {PUBLIC_GROUPS.map(g => <RouteGroupCard key={g.id} group={g} />)}
        </div>
      </section>

      {/* ADMIN */}
      <section>
        <h2 className="text-xs uppercase font-bold tracking-widest text-fuchsia-400 mb-3 flex items-center gap-1.5">
          🔒 Back-office ({totalAdmin} routes)
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          {ADMIN_GROUPS.map(g => <RouteGroupCard key={g.id} group={g} />)}
        </div>
      </section>

      {/* SEEDS À LANCER */}
      {isAdmin && (
        <section>
          <h2 className="text-xs uppercase font-bold tracking-widest text-amber-400 mb-3 flex items-center gap-1.5">
            ⚡ Endpoints à lancer pour activer les nouveautés
          </h2>
          <div className="space-y-2">
            {SEEDS_TO_RUN.map(s => (
              <article key={s.url} className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm flex items-center gap-2">
                    {s.label}
                    <span className="text-[10px] bg-amber-500/30 text-amber-100 px-2 py-0.5 rounded-full font-bold">{s.method}</span>
                  </div>
                  <code className="text-[11px] text-amber-300 font-mono">{s.url}</code>
                  <p className="text-[11px] text-zinc-400 mt-1">{s.description}</p>
                </div>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
                >
                  Tester →
                </a>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RouteGroupCard({ group }: { group: RouteGroup }) {
  const newCount = group.routes.filter(r => r.isNew).length;
  return (
    <article className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition" style={{ borderTopColor: group.color, borderTopWidth: 4 }}>
      <header className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-base flex items-center gap-2">
          <span className="text-xl">{group.emoji}</span> {group.label}
        </h3>
        <div className="flex gap-1.5 text-[10px]">
          <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{group.routes.length}</span>
          {newCount > 0 && <span className="bg-fuchsia-500/30 text-fuchsia-200 px-2 py-0.5 rounded-full font-bold">✨ {newCount}</span>}
        </div>
      </header>
      <ul className="space-y-1.5">
        {group.routes.map(r => (
          <li key={r.href}>
            <Link
              href={r.href}
              target={r.external ? '_blank' : undefined}
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition group"
            >
              <ArrowRight size={11} className="text-zinc-600 mt-1 group-hover:text-fuchsia-400 transition shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-bold text-zinc-200 group-hover:text-white truncate">{r.label}</span>
                  {r.isNew && <span className="bg-fuchsia-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">NEW</span>}
                  {r.isAdmin && <span className="bg-violet-500/30 text-violet-200 text-[9px] font-bold px-1.5 py-0.5 rounded-full">ADMIN</span>}
                </div>
                {r.desc && <div className="text-[11px] text-zinc-500 mt-0.5">{r.desc}</div>}
                <div className="text-[10px] text-zinc-600 font-mono">{r.href}</div>
              </div>
              {r.external && <ExternalLink size={10} className="text-zinc-600" />}
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
