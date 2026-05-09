/**
 * Métadonnées des pages admin pour le banner animé.
 *
 * Chaque page a :
 *   - title       : titre principal
 *   - desc        : description courte (sous-titre)
 *   - emoji       : grand emoji affiché à gauche
 *   - gradient    : couleurs Tailwind du gradient (from-X to-Y)
 *   - pattern     : type de pattern SVG animé (dots/hex/waves/orbits/grid/spark)
 *   - badge       : (optionnel) "NEW" / "BETA" / "ADMIN" / "DANGER"
 *   - color       : couleur principale (hex pour SVG)
 *
 * Resolution : matching par préfixe (la première règle qui matche gagne).
 * Mettre les routes les plus SPÉCIFIQUES en premier.
 */

export interface AdminPageMeta {
  title: string;
  desc: string;
  emoji: string;
  gradient: string;     // ex: 'from-fuchsia-500 via-violet-500 to-cyan-500'
  pattern: 'dots' | 'hex' | 'waves' | 'orbits' | 'grid' | 'spark' | 'aurora' | 'circuit';
  badge?: 'NEW' | 'BETA' | 'ADMIN' | 'DANGER';
  color?: string;       // hex couleur principale pour SVG
}

interface MetaRule {
  match: string;         // préfixe URL (ex: '/admin/prices')
  exact?: boolean;       // si true, match exact uniquement
  meta: AdminPageMeta;
}

// Ordre IMPORTANT : routes les plus spécifiques en premier
const RULES: MetaRule[] = [
  // ─── 🆕 NOUVEAU ──────────────────────────────────────────
  { match: '/admin/sitemap', meta: {
    title: 'Site map (front + back)', desc: 'Toutes les pages publiques + admin avec tags ✨ NEW',
    emoji: '🗺️', gradient: 'from-yellow-400 via-amber-500 to-orange-500', pattern: 'grid', badge: 'NEW', color: '#fbbf24'
  }},
  { match: '/admin/claude-cli', meta: {
    title: 'Claude CLI online', desc: 'Lance Claude Code en autonome — code, vidéos MCP, refactor, debug',
    emoji: '🤖', gradient: 'from-violet-500 via-fuchsia-500 to-rose-500', pattern: 'circuit', badge: 'NEW', color: '#a855f7'
  }},
  { match: '/admin/vscode-online', meta: {
    title: 'VS Code online', desc: 'github.dev · vscode.dev · Codespaces · code-server self-hosted · quick editor',
    emoji: '💻', gradient: 'from-blue-500 via-cyan-500 to-emerald-500', pattern: 'circuit', badge: 'NEW', color: '#06b6d4'
  }},
  { match: '/admin/feature-chat', meta: {
    title: 'Feature Chat IA', desc: 'Brainstorm tes prochaines features avec une IA — copy from Cowork',
    emoji: '💡', gradient: 'from-yellow-400 via-amber-500 to-rose-500', pattern: 'spark', badge: 'NEW', color: '#fbbf24'
  }},
  { match: '/admin/time-machine', meta: {
    title: 'Time Machine', desc: 'Rollback git visuel — reviens à n\'importe quel commit en un clic',
    emoji: '🕰️', gradient: 'from-indigo-500 via-violet-500 to-fuchsia-500', pattern: 'orbits', badge: 'NEW', color: '#8b5cf6'
  }},
  { match: '/admin/invitations', meta: {
    title: 'Invitations admin', desc: 'Codes d\'invitation pour ouvrir l\'accès iPad/EDITOR à des utilisateurs ciblés',
    emoji: '🔑', gradient: 'from-amber-500 via-orange-500 to-red-500', pattern: 'spark', badge: 'NEW', color: '#f59e0b'
  }},
  { match: '/admin/security-settings', meta: {
    title: 'Sécurité (super-admin)', desc: 'Toggle méthodes de login · signup · MFA · ACL Tailscale',
    emoji: '🛡️', gradient: 'from-rose-500 via-red-500 to-orange-500', pattern: 'circuit', badge: 'ADMIN', color: '#f43f5e'
  }},
  { match: '/admin/security-2fa', meta: {
    title: 'Mon 2FA TOTP', desc: 'QR code Google/Microsoft Authenticator + 10 backup codes',
    emoji: '🔐', gradient: 'from-emerald-500 via-cyan-500 to-blue-500', pattern: 'circuit', badge: 'NEW', color: '#10b981'
  }},
  { match: '/admin/menu-permissions', meta: {
    title: 'Visibilité du menu', desc: 'Permissions globales par rôle + overrides fins par utilisateur',
    emoji: '🎚️', gradient: 'from-zinc-600 via-violet-700 to-zinc-800', pattern: 'grid', badge: 'ADMIN', color: '#7c3aed'
  }},

  // ─── ESPACE PRO ──────────────────────────────────────────
  { match: '/admin/pro/venues', meta: {
    title: 'Mes lieux (Pro)', desc: 'CRUD complet, IA enrich bulk, freshness score',
    emoji: '🏪', gradient: 'from-emerald-500 via-cyan-500 to-teal-500', pattern: 'hex', color: '#10b981'
  }},
  { match: '/admin/pro/events', meta: {
    title: 'Mes événements', desc: 'Bouton Enrichir agenda mondial 85 events',
    emoji: '🎉', gradient: 'from-emerald-500 via-cyan-500 to-blue-500', pattern: 'spark', color: '#10b981'
  }},
  { match: '/admin/pro/import-events', meta: {
    title: 'Import events Facebook', desc: 'Sync de tes events Facebook vers ton agenda GLD',
    emoji: '📘', gradient: 'from-blue-500 via-indigo-500 to-violet-500', pattern: 'orbits', color: '#3b82f6'
  }},
  { match: '/admin/pro/ai-studio', meta: {
    title: 'Studio IA Pro', desc: 'Génération de visuels et textes pour ton établissement',
    emoji: '✨', gradient: 'from-emerald-500 via-violet-500 to-fuchsia-500', pattern: 'aurora', color: '#a855f7'
  }},
  { match: '/admin/pro', meta: {
    title: 'Dashboard Pro', desc: 'Vue d\'ensemble de ton espace pro — stats, événements, lieux',
    emoji: '🏪', gradient: 'from-emerald-500 via-cyan-500 to-teal-500', pattern: 'dots', color: '#10b981'
  }},

  // ─── 💰 PRIX & TARIFS ────────────────────────────────────
  { match: '/admin/prices/', meta: {
    title: 'Détail produit surveillé', desc: 'Historique des prix, concurrents, alertes, RAG produit',
    emoji: '📈', gradient: 'from-lime-500 via-emerald-500 to-teal-500', pattern: 'waves', color: '#84cc16'
  }},
  { match: '/admin/prices', meta: {
    title: 'Comparateur prix multi-site', desc: 'JSON-LD/microdata · alertes · graph · RAG produit · sync PIM',
    emoji: '💰', gradient: 'from-lime-500 via-emerald-500 to-cyan-500', pattern: 'waves', badge: 'NEW', color: '#84cc16'
  }},
  { match: '/admin/tariffs', meta: {
    title: 'Ingestion tarifs fournisseurs', desc: 'CSV/XML/JSON · webhook mail Resend · cron HTTP · mapping flexible',
    emoji: '📊', gradient: 'from-lime-500 via-amber-500 to-orange-500', pattern: 'grid', badge: 'NEW', color: '#84cc16'
  }},

  // ─── BOUTIQUE ────────────────────────────────────────────
  { match: '/admin/shop/orders', meta: {
    title: 'Commandes', desc: 'Historique, statuts, fulfillment',
    emoji: '📦', gradient: 'from-amber-500 via-orange-500 to-red-500', pattern: 'dots', color: '#f59e0b'
  }},
  { match: '/admin/shop/dropshipping', meta: {
    title: 'Dropshipping', desc: 'Fournisseurs, sync auto catalogue, marges',
    emoji: '🚚', gradient: 'from-amber-500 via-orange-500 to-yellow-500', pattern: 'orbits', color: '#f59e0b'
  }},
  { match: '/admin/shop', meta: {
    title: 'Produits boutique', desc: 'Catalogue, variantes, stock, photos',
    emoji: '🛍️', gradient: 'from-amber-500 via-orange-500 to-pink-500', pattern: 'hex', color: '#f59e0b'
  }},

  // ─── CONTENU ─────────────────────────────────────────────
  { match: '/admin/moderation', meta: {
    title: 'Modération', desc: 'Photos, posts, témoignages — modération IA + humaine',
    emoji: '🛡️', gradient: 'from-fuchsia-500 via-pink-500 to-rose-500', pattern: 'circuit', color: '#d946ef'
  }},
  { match: '/admin/import', meta: {
    title: 'Import en masse', desc: 'CSV, JSON, GDoc → DB GLD',
    emoji: '📥', gradient: 'from-fuchsia-500 via-violet-500 to-cyan-500', pattern: 'waves', color: '#d946ef'
  }},
  { match: '/admin/map', meta: {
    title: 'Carte mondiale', desc: 'Visualisation géo des lieux, événements, prières',
    emoji: '🗺️', gradient: 'from-emerald-500 via-cyan-500 to-blue-500', pattern: 'grid', color: '#06b6d4'
  }},
  { match: '/admin/posters', meta: {
    title: 'Affiches PDF', desc: 'Génération d\'affiches imprimables avec QR codes',
    emoji: '🖼️', gradient: 'from-fuchsia-500 via-rose-500 to-orange-500', pattern: 'aurora', color: '#d946ef'
  }},
  { match: '/admin/news', meta: {
    title: 'Actualités', desc: 'Articles, posts, blog GLD',
    emoji: '📰', gradient: 'from-fuchsia-500 via-pink-500 to-rose-500', pattern: 'dots', color: '#d946ef'
  }},
  { match: '/admin/events', meta: {
    title: 'Événements (agenda)', desc: 'Agenda global LGBT+ et religieux mondial',
    emoji: '📅', gradient: 'from-fuchsia-500 via-violet-500 to-blue-500', pattern: 'orbits', color: '#a855f7'
  }},
  { match: '/admin/venues', meta: {
    title: 'Lieux LGBT-friendly', desc: 'Annuaire enrichi 2700+ adresses',
    emoji: '🏳️‍🌈', gradient: 'from-pink-500 via-fuchsia-500 to-violet-500', pattern: 'hex', color: '#d946ef'
  }},
  { match: '/admin/forum', meta: {
    title: 'Forum (modération)', desc: 'Threads, posts, modération IA + Telegram',
    emoji: '💬', gradient: 'from-fuchsia-500 via-cyan-500 to-emerald-500', pattern: 'waves', color: '#06b6d4'
  }},
  { match: '/admin/temoignages', meta: {
    title: 'Témoignages vidéo', desc: 'Modération + mise en avant',
    emoji: '🎥', gradient: 'from-rose-500 via-fuchsia-500 to-violet-500', pattern: 'spark', color: '#f43f5e'
  }},
  { match: '/admin/coupons', meta: {
    title: 'Coupons & promos', desc: 'Codes promo, parrainage, programmes',
    emoji: '🎟️', gradient: 'from-amber-500 via-rose-500 to-fuchsia-500', pattern: 'spark', color: '#f59e0b'
  }},
  { match: '/admin/videos', meta: {
    title: 'Vidéos YouTube', desc: 'Embed sur le front, playlists, lives',
    emoji: '📺', gradient: 'from-rose-500 via-red-500 to-orange-500', pattern: 'circuit', color: '#ef4444'
  }},
  { match: '/admin/banners', meta: {
    title: 'Bannières (hero)', desc: 'Bannières affichées sur la home et les sections',
    emoji: '🎨', gradient: 'from-fuchsia-500 via-pink-500 to-rose-500', pattern: 'aurora', color: '#d946ef'
  }},
  { match: '/admin/establishments', meta: {
    title: 'Établissements (annuaire)', desc: 'CRUD complet, enrich IA bulk, freshness score',
    emoji: '🏛️', gradient: 'from-emerald-500 via-cyan-500 to-blue-500', pattern: 'hex', color: '#10b981'
  }},

  // ─── COMMUNICATION ───────────────────────────────────────
  { match: '/admin/newsletter/plan', meta: {
    title: 'Plan newsletter annuel', desc: 'Calendrier édition, briefs IA, templates',
    emoji: '📅', gradient: 'from-cyan-500 via-blue-500 to-indigo-500', pattern: 'grid', color: '#06b6d4'
  }},
  { match: '/admin/newsletter', meta: {
    title: 'Newsletter', desc: 'Preview · test · schedule · listes · campaigns',
    emoji: '📧', gradient: 'from-cyan-500 via-blue-500 to-violet-500', pattern: 'waves', color: '#06b6d4'
  }},
  { match: '/admin/calendar', meta: {
    title: 'Calendrier social', desc: 'Posts programmés tous réseaux',
    emoji: '📆', gradient: 'from-blue-500 via-cyan-500 to-emerald-500', pattern: 'grid', color: '#3b82f6'
  }},
  { match: '/admin/pages', meta: {
    title: 'Pages riches', desc: 'CMS visuel pour les sections du site',
    emoji: '📄', gradient: 'from-blue-500 via-violet-500 to-fuchsia-500', pattern: 'orbits', color: '#3b82f6'
  }},
  { match: '/admin/content', meta: {
    title: 'Pages & blog', desc: 'Articles, pages légales, contenu éditorial',
    emoji: '📝', gradient: 'from-cyan-500 via-blue-500 to-indigo-500', pattern: 'dots', color: '#06b6d4'
  }},
  { match: '/admin/partners', meta: {
    title: 'Partenaires', desc: 'Logos, liens, accords de partenariat',
    emoji: '🤝', gradient: 'from-emerald-500 via-cyan-500 to-blue-500', pattern: 'hex', color: '#10b981'
  }},
  { match: '/admin/donate', meta: {
    title: 'Dons & ticker', desc: 'Configuration HelloAsso, ticker live, objectifs',
    emoji: '❤️', gradient: 'from-rose-500 via-pink-500 to-fuchsia-500', pattern: 'spark', color: '#f43f5e'
  }},

  // ─── 🌈 GLD CONNECT ──────────────────────────────────────
  { match: '/admin/connect/moderation', meta: {
    title: 'Modération Connect', desc: 'Posts · messages · reports · blocks',
    emoji: '🛡️', gradient: 'from-rose-500 via-fuchsia-500 to-violet-500', pattern: 'circuit', color: '#f43f5e'
  }},
  { match: '/admin/connect', meta: {
    title: 'Dashboard Connect', desc: 'Réseau social GLD · communauté · matches · live',
    emoji: '🌈', gradient: 'from-rose-500 via-fuchsia-500 to-cyan-500', pattern: 'aurora', color: '#f43f5e'
  }},

  // ─── IA & OUTILS ─────────────────────────────────────────
  { match: '/admin/ai/knowledge/brain', meta: {
    title: 'Brain 3D (RAG visualisation)', desc: 'Three.js · PCA 3 composantes · 8 clusters · mode JARVIS',
    emoji: '🧠', gradient: 'from-cyan-400 via-blue-500 to-violet-600', pattern: 'orbits', badge: 'NEW', color: '#00d4ff'
  }},
  { match: '/admin/ai/knowledge/playground', meta: {
    title: 'Playground RAG', desc: 'Toggle garde-fous · chunks détaillés · ADMIN-only',
    emoji: '💬', gradient: 'from-violet-500 via-fuchsia-500 to-pink-500', pattern: 'spark', badge: 'ADMIN', color: '#a855f7'
  }},
  { match: '/admin/ai/knowledge/scraper', meta: {
    title: 'Scraper polite-fetch', desc: 'UA rotation · throttle hostname · backoff 429/503 · fallback Jina',
    emoji: '🕷️', gradient: 'from-violet-500 via-purple-500 to-pink-500', pattern: 'circuit', badge: 'NEW', color: '#8b5cf6'
  }},
  { match: '/admin/ai/knowledge', meta: {
    title: 'Cerveau de GLD (RAG)', desc: 'Knowledge base · embeddings Gemini · 2329+ chunks',
    emoji: '🧠', gradient: 'from-violet-500 via-fuchsia-500 to-cyan-500', pattern: 'aurora', color: '#a855f7'
  }},
  { match: '/admin/ai/legal', meta: {
    title: 'Assistant juridique FR', desc: '6 skills MIT paperasse · sync GitHub · guardrails strictes',
    emoji: '⚖️', gradient: 'from-amber-500 via-orange-500 to-rose-500', pattern: 'grid', badge: 'NEW', color: '#f59e0b'
  }},
  { match: '/admin/ai/avatar', meta: {
    title: 'GLD Live (avatar vidéo)', desc: 'Génération de vidéos avec ton avatar IA',
    emoji: '🎭', gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', pattern: 'spark', color: '#a855f7'
  }},
  { match: '/admin/ai-settings', meta: {
    title: 'AI Settings (multi-providers)', desc: 'Gemini · OpenRouter · Ollama · LM Studio · model picker',
    emoji: '⚙️', gradient: 'from-violet-500 via-purple-500 to-blue-500', pattern: 'circuit', badge: 'NEW', color: '#a855f7'
  }},
  { match: '/admin/ai-autopilot', meta: {
    title: 'AI Autopilot', desc: 'Tâches IA récurrentes · enrich · classification · génération',
    emoji: '🤖', gradient: 'from-violet-500 via-cyan-500 to-emerald-500', pattern: 'orbits', color: '#a855f7'
  }},
  { match: '/admin/ai', meta: {
    title: 'Studio IA', desc: 'Génération de textes, images, vidéos, audio',
    emoji: '✨', gradient: 'from-violet-500 via-fuchsia-500 to-pink-500', pattern: 'aurora', color: '#a855f7'
  }},
  { match: '/admin/avatar-studio', meta: {
    title: 'Avatar Studio (Avatar V)', desc: 'HeyGen v5 · upper-body · cross-outfits · 15s',
    emoji: '🎬', gradient: 'from-violet-500 via-rose-500 to-amber-500', pattern: 'spark', badge: 'NEW', color: '#a855f7'
  }},
  { match: '/admin/manuals', meta: {
    title: 'Manuels auto IA', desc: '3 audiences · 5499 mots · email auto + Telegram + script vidéo',
    emoji: '📚', gradient: 'from-amber-500 via-orange-500 to-fuchsia-500', pattern: 'dots', color: '#f59e0b'
  }},
  { match: '/admin/i18n', meta: {
    title: 'Traductions IA', desc: 'FR / EN / ES / PT — auto-translation Gemini',
    emoji: '🌍', gradient: 'from-cyan-500 via-blue-500 to-violet-500', pattern: 'orbits', color: '#06b6d4'
  }},
  { match: '/admin/integrations/telegram', meta: {
    title: 'Bot Telegram', desc: 'Notifications + commandes admin via Telegram',
    emoji: '✈️', gradient: 'from-cyan-500 via-blue-500 to-indigo-500', pattern: 'spark', color: '#06b6d4'
  }},
  { match: '/admin/integrations', meta: {
    title: 'Intégrations', desc: 'Connecteurs externes · webhooks · APIs',
    emoji: '🔌', gradient: 'from-violet-500 via-blue-500 to-cyan-500', pattern: 'circuit', color: '#a855f7'
  }},
  { match: '/admin/mail-setup', meta: {
    title: 'Setup mail (Gmail / DNS)', desc: 'SPF, DKIM, DMARC, Resend, Gmail relay',
    emoji: '📬', gradient: 'from-blue-500 via-cyan-500 to-emerald-500', pattern: 'grid', color: '#3b82f6'
  }},
  { match: '/admin/themes', meta: {
    title: 'Thèmes saisonniers', desc: 'Halloween, Pride, Noël… auto-switch selon date',
    emoji: '🎨', gradient: 'from-fuchsia-500 via-amber-500 to-emerald-500', pattern: 'aurora', color: '#d946ef'
  }},
  { match: '/admin/features', meta: {
    title: 'Feature flags', desc: 'Active/désactive des fonctionnalités sans redéployer',
    emoji: '🚦', gradient: 'from-amber-500 via-emerald-500 to-cyan-500', pattern: 'spark', color: '#10b981'
  }},
  { match: '/admin/setup', meta: {
    title: 'Assistant configuration', desc: 'Wizard de setup initial · variables · seeds',
    emoji: '🛠️', gradient: 'from-violet-500 via-fuchsia-500 to-rose-500', pattern: 'orbits', color: '#a855f7'
  }},

  // ─── SYSTÈME ─────────────────────────────────────────────
  { match: '/admin/menu', meta: {
    title: 'Menu navigation', desc: 'Configuration du menu front (mega-menus, ordre, badges)',
    emoji: '☰', gradient: 'from-zinc-500 via-zinc-600 to-zinc-700', pattern: 'grid', color: '#71717a'
  }},
  { match: '/admin/home', meta: {
    title: 'Page d\'accueil', desc: 'Hero, sections, blocs, ordre',
    emoji: '🏠', gradient: 'from-zinc-500 via-cyan-500 to-blue-500', pattern: 'dots', color: '#06b6d4'
  }},
  { match: '/admin/users', meta: {
    title: 'Utilisateurs', desc: 'Gestion comptes · rôles · invitations · ban',
    emoji: '👥', gradient: 'from-zinc-500 via-violet-500 to-fuchsia-500', pattern: 'hex', color: '#a855f7'
  }},
  { match: '/admin/backup', meta: {
    title: 'Sauvegardes (backup)', desc: 'Snapshots DB · MinIO · restore',
    emoji: '💾', gradient: 'from-zinc-500 via-blue-500 to-emerald-500', pattern: 'circuit', color: '#3b82f6'
  }},
  { match: '/admin/settings', meta: {
    title: 'Paramètres', desc: 'Configuration globale du site',
    emoji: '⚙️', gradient: 'from-zinc-500 via-zinc-600 to-zinc-700', pattern: 'grid', color: '#71717a'
  }},

  // ─── DASHBOARD (catch-all en dernier) ────────────────────
  { match: '/admin', exact: true, meta: {
    title: 'Tableau de bord', desc: 'Vue d\'ensemble du back-office GLD',
    emoji: '📊', gradient: 'from-fuchsia-500 via-violet-500 to-cyan-500', pattern: 'aurora', color: '#d946ef'
  }}
];

const DEFAULT_META: AdminPageMeta = {
  title: 'Back-office',
  desc: 'God Loves Diversity — Admin',
  emoji: '⚡',
  gradient: 'from-zinc-500 via-zinc-700 to-zinc-900',
  pattern: 'grid',
  color: '#71717a'
};

/**
 * Trouve la métadonnée correspondant à un pathname.
 * Match par préfixe (le plus long gagne) sauf si exact:true.
 */
export function getAdminPageMeta(pathname: string): AdminPageMeta {
  // Filtrage : exact d'abord, puis ordre déclaré (préfixes)
  const exact = RULES.find((r) => r.exact && pathname === r.match);
  if (exact) return exact.meta;

  for (const r of RULES) {
    if (r.exact) continue;
    if (pathname === r.match || pathname.startsWith(r.match + '/')) {
      return r.meta;
    }
  }
  return DEFAULT_META;
}
