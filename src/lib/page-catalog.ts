/**
 * Catalogue des pages frontend connues.
 *
 * En production Coolify, fs.readdir ne fonctionne pas sur le code source
 * (Next.js standalone build). On utilise donc cette liste hardcodée comme
 * source de vérité, complétée à runtime par les blocs DB.
 */

export interface PageMeta {
  slug: string;
  label: string;
  desc: string;
  emoji: string;
  category: 'home' | 'spiritual' | 'community' | 'pro' | 'shop' | 'legal' | 'utility' | 'demo';
}

export const PAGE_CATALOG: PageMeta[] = [
  // ─── HOME / CORE ─────────────────────────────────
  { slug: '',                      label: 'Accueil',              desc: 'Page d\'accueil',                     emoji: '🏠', category: 'home' },
  { slug: 'a-propos',              label: 'À propos',             desc: 'Qui sommes-nous',                     emoji: '👥', category: 'home' },
  { slug: 'message',               label: 'Le message',           desc: 'Manifeste GLD',                        emoji: '📖', category: 'home' },
  { slug: 'argumentaire',          label: 'Argumentaire',         desc: 'Quatre vérités simples',              emoji: '✊', category: 'home' },

  // ─── SPIRITUAL ────────────────────────────────────
  { slug: 'cercles-priere',        label: 'Cercles de prière',    desc: 'Page spirituelle live',               emoji: '🙏', category: 'spiritual' },
  { slug: 'champ-de-priere',       label: 'Champ de prières',     desc: 'Carte mondiale heatmap',              emoji: '🗺️', category: 'spiritual' },
  { slug: 'camino',                label: 'Camino virtuel',       desc: 'Pèlerinage gamifié',                  emoji: '🚶', category: 'spiritual' },
  { slug: 'webcams-live',          label: 'Webcams live',         desc: 'Lieux saints en direct',              emoji: '📹', category: 'spiritual' },
  { slug: 'journal',               label: 'Journal vocal',        desc: 'Prières vocales',                     emoji: '🎙️', category: 'spiritual' },
  { slug: 'verset-inclusif',       label: 'Versets inclusifs',    desc: 'Textes sacrés relus',                 emoji: '📜', category: 'spiritual' },
  { slug: 'textes-sacres',         label: 'Textes sacrés',        desc: 'Bibliothèque',                        emoji: '📚', category: 'spiritual' },
  { slug: 'compagnon-spirituel',   label: 'Compagnon spirituel',  desc: 'IA d\'accompagnement',                emoji: '✨', category: 'spiritual' },
  { slug: 'temoignage-ia',         label: 'Témoignage IA',        desc: 'Génération de témoignages',           emoji: '💬', category: 'spiritual' },
  { slug: 'temoignages',           label: 'Témoignages',          desc: 'Communauté',                          emoji: '🗣️', category: 'spiritual' },
  { slug: 'calendrier-religieux',  label: 'Calendrier religieux', desc: 'Fêtes inter-religieuses',             emoji: '📅', category: 'spiritual' },
  { slug: 'voice-coach',           label: 'Voice coach',          desc: 'Coach vocal IA',                      emoji: '🎤', category: 'spiritual' },

  // ─── COMMUNITY ────────────────────────────────────
  { slug: 'forum',                 label: 'Forum',                desc: 'Discussions communauté',              emoji: '💬', category: 'community' },
  { slug: 'meetups',               label: 'Meetups',              desc: 'Rencontres locales',                  emoji: '🤝', category: 'community' },
  { slug: 'agenda',                label: 'Agenda',               desc: 'Événements à venir',                  emoji: '📆', category: 'community' },
  { slug: 'parrainage',            label: 'Parrainage',           desc: 'Programme invitation amis',           emoji: '🎁', category: 'community' },
  { slug: 'mentor',                label: 'Mentor',               desc: 'Programme mentorat',                  emoji: '🤝', category: 'community' },
  { slug: 'galerie',               label: 'Galerie',              desc: 'Photos communauté',                   emoji: '🖼️', category: 'community' },
  { slug: 'photo',                 label: 'Photo',                desc: 'Portfolio',                           emoji: '📸', category: 'community' },
  { slug: 'newsletter',            label: 'Newsletter',           desc: 'Inscription',                         emoji: '✉️', category: 'community' },
  { slug: 'newsletters',           label: 'Newsletters',          desc: 'Archives',                            emoji: '📰', category: 'community' },
  { slug: 'blog',                  label: 'Blog',                 desc: 'Articles',                            emoji: '📝', category: 'community' },
  { slug: 'wrapped',               label: 'Wrapped',              desc: 'Bilan annuel personnalisé',           emoji: '🎉', category: 'community' },
  { slug: 'partager',              label: 'Carte de partage',     desc: 'Page sharing',                        emoji: '🎁', category: 'community' },
  { slug: 'participer',            label: 'Participer',           desc: 'Comment s\'engager',                  emoji: '🌈', category: 'community' },
  { slug: 'partenaires',           label: 'Partenaires',          desc: 'Marques alliées',                     emoji: '🤝', category: 'community' },

  // ─── PRO / VENUES ─────────────────────────────────
  { slug: 'lieux',                 label: 'Lieux',                desc: 'Annuaire LGBT-friendly',              emoji: '📍', category: 'pro' },
  { slug: 'carte',                 label: 'Carte mondiale',       desc: 'Lieux + safety',                      emoji: '🗺️', category: 'pro' },
  { slug: 'espace-pro',            label: 'Espace pro',           desc: 'Espace partenaires',                  emoji: '🏢', category: 'pro' },
  { slug: 'gld-local',             label: 'GLD local',            desc: 'Activité locale',                     emoji: '📌', category: 'pro' },
  { slug: 'officiants',            label: 'Officiants',           desc: 'Marketplace officiants',              emoji: '⛪', category: 'pro' },
  { slug: 'hebergement',           label: 'Hébergement',          desc: 'Voyage safe',                         emoji: '🏨', category: 'pro' },
  { slug: 'voyage-safe',           label: 'Voyage safe',          desc: 'Guides + safety',                     emoji: '✈️', category: 'pro' },

  // ─── SHOP / FUNDING ───────────────────────────────
  { slug: 'boutique',              label: 'Boutique',             desc: 'Articles GLD',                        emoji: '🛍️', category: 'shop' },
  { slug: 'panier',                label: 'Panier',               desc: 'Cart',                                emoji: '🛒', category: 'shop' },
  { slug: 'commande',              label: 'Commande',             desc: 'Confirmation commande',               emoji: '📦', category: 'shop' },
  { slug: 'merci',                 label: 'Merci',                desc: 'Page remerciement',                   emoji: '🙏', category: 'shop' },
  { slug: 'don',                   label: 'Don',                  desc: 'Soutien financier',                   emoji: '💝', category: 'shop' },
  { slug: 'crowdfunding',          label: 'Crowdfunding',         desc: 'Page collecte LGBT',                  emoji: '💰', category: 'shop' },
  { slug: 'membre-plus',           label: 'Membre+ Premium',      desc: 'Page abonnement',                     emoji: '💎', category: 'shop' },
  { slug: 'marketplace',           label: 'Marketplace',          desc: 'Place de marché',                     emoji: '🏪', category: 'shop' },
  { slug: 'affiches',              label: 'Affiches',             desc: 'Posters à imprimer',                  emoji: '🖼️', category: 'shop' },

  // ─── LEGAL / UTILITY ──────────────────────────────
  { slug: 'contact',               label: 'Contact',              desc: 'Formulaire contact',                  emoji: '✉️', category: 'utility' },
  { slug: 'inscription',           label: 'Inscription',          desc: 'Signup',                              emoji: '📝', category: 'utility' },
  { slug: 'mon-espace',            label: 'Mon espace',           desc: 'Compte utilisateur',                  emoji: '👤', category: 'utility' },
  { slug: 'aide-juridique',        label: 'Aide juridique',       desc: 'RAG legal',                           emoji: '⚖️', category: 'utility' },
  { slug: 'sos',                   label: 'SOS',                  desc: 'Aide urgente',                        emoji: '🚨', category: 'utility' },
  { slug: 'signalement',           label: 'Signalement',          desc: 'Reporter un incident',                emoji: '⚠️', category: 'utility' },
  { slug: 'mentions-legales',      label: 'Mentions légales',     desc: 'Legal',                               emoji: '📄', category: 'legal' },
  { slug: 'rgpd',                  label: 'RGPD',                 desc: 'Vie privée',                          emoji: '🔒', category: 'legal' },
  { slug: 'mode-calculatrice',     label: 'Mode calculatrice',    desc: 'Mode discret',                        emoji: '🔒', category: 'utility' },
  { slug: 'coming-soon',           label: 'Coming soon',          desc: 'Page d\'attente',                     emoji: '⏳', category: 'utility' },

  // ─── DEMO ─────────────────────────────────────────
  { slug: 'demo-parallax-photo',   label: 'Démo Parallax',        desc: 'Page de démo',                        emoji: '✨', category: 'demo' }
];

export const CATEGORIES = [
  { id: 'home',       label: 'Accueil & manifeste', emoji: '🏠', color: 'fuchsia' },
  { id: 'spiritual',  label: 'Spirituel',           emoji: '🙏', color: 'violet'  },
  { id: 'community',  label: 'Communauté',          emoji: '🤝', color: 'cyan'    },
  { id: 'pro',        label: 'Lieux & pro',         emoji: '🏢', color: 'emerald' },
  { id: 'shop',       label: 'Shop & fund',         emoji: '🛍️', color: 'amber'   },
  { id: 'utility',    label: 'Utility',             emoji: '🛠', color: 'sky'     },
  { id: 'legal',      label: 'Légal',               emoji: '📄', color: 'zinc'    },
  { id: 'demo',       label: 'Démos',               emoji: '✨', color: 'rose'    }
] as const;

export function getPageMeta(slug: string): PageMeta {
  const found = PAGE_CATALOG.find((p) => p.slug === slug);
  if (found) return found;
  return {
    slug,
    label: slug.split('/').pop()?.replace(/-/g, ' ') || slug,
    desc: 'Page custom',
    emoji: '📄',
    category: 'utility'
  };
}
