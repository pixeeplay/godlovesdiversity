/**
 * Seed des 50 thèmes GLD :
 * - 20 fêtes (auto-activation par date) — religieuses, civiques, LGBT, culturelles, saisonnières
 * - 30 esthétiques permanentes (activables manuellement)
 *
 * Chaque thème définit :
 * - colors : variables CSS injectées en :root
 * - decorations : animations à activer (snow, hearts, confetti, etc.)
 * - customCss : CSS additionnel optionnel
 * - holidaySlug + daysBefore + durationDays : auto-activation
 */

export type ThemeSeed = {
  slug: string;
  name: string;
  description: string;
  category: 'holiday' | 'religious' | 'national' | 'aesthetic' | 'seasonal';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    fg: string;
    border?: string;
    surface?: string;
  };
  fonts?: { display?: string; body?: string };
  decorations?: {
    snow?: boolean;
    confetti?: boolean;
    hearts?: boolean;
    petals?: boolean;
    rainbow?: boolean;
    fireworks?: boolean;
    bubbles?: boolean;
    leaves?: boolean;
    stars?: boolean;
    pumpkins?: boolean;
    eggs?: boolean;
    lanterns?: boolean;
    diamonds?: boolean;
  };
  customCss?: string;
  autoActivate: boolean;
  daysBefore: number;
  durationDays: number;
  holidaySlug?: string;
  geographicScope?: string;
  priority?: number;
};

export const THEMES_SEED: ThemeSeed[] = [
  /* =================== FÊTES LGBT (5) =================== */
  {
    slug: 'pride-rainbow', name: '🏳️‍🌈 Pride Month', description: 'Arc-en-ciel pulsant pour le mois des fiertés (juin)',
    category: 'holiday',
    colors: { primary: '#e40303', secondary: '#ff8c00', accent: '#ffed00', bg: '#0a0a14', fg: '#ffffff', border: '#ff00aa44' },
    decorations: { rainbow: true, hearts: true, confetti: true },
    customCss: `body { background: linear-gradient(135deg,#0a0a14 0%,#1a0a2a 50%,#0a0a14 100%); }
.gld-rainbow-bar { background: linear-gradient(90deg,#e40303,#ff8c00,#ffed00,#008026,#004dff,#750787); height: 6px; position: fixed; top: 0; left: 0; right: 0; z-index: 9999; animation: gld-shimmer 3s infinite; }`,
    autoActivate: true, daysBefore: 14, durationDays: 35, holidaySlug: 'pride-month', priority: 10
  },
  {
    slug: 'idahobit', name: '🌈 IDAHOBIT', description: 'Journée internationale contre l\'homophobie (17 mai)',
    category: 'holiday',
    colors: { primary: '#d61b80', secondary: '#7c3aed', accent: '#06b6d4', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { rainbow: true, hearts: true },
    autoActivate: true, daysBefore: 7, durationDays: 4, holidaySlug: 'idahobit', priority: 8
  },
  {
    slug: 'coming-out', name: '✨ Coming Out Day', description: '11 octobre — coming out',
    category: 'holiday',
    colors: { primary: '#fbbf24', secondary: '#f472b6', accent: '#a78bfa', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { stars: true, hearts: true },
    autoActivate: true, daysBefore: 5, durationDays: 3, holidaySlug: 'coming-out-day', priority: 7
  },
  {
    slug: 'trans-remembrance', name: '🕯️ Souvenir trans (TDoR)',
    description: '20 novembre — journée de commémoration trans',
    category: 'holiday',
    colors: { primary: '#5BCEFA', secondary: '#F5A9B8', accent: '#ffffff', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { stars: true },
    autoActivate: true, daysBefore: 3, durationDays: 2, holidaySlug: 'trans-day', priority: 9
  },
  {
    slug: 'pride-paris', name: '🇫🇷🏳️‍🌈 Pride Paris', description: 'Marche des fiertés Paris (fin juin)',
    category: 'holiday',
    colors: { primary: '#e40303', secondary: '#750787', accent: '#ffed00', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { rainbow: true, confetti: true, hearts: true },
    autoActivate: true, daysBefore: 7, durationDays: 5, holidaySlug: 'pride-paris', geographicScope: 'FR', priority: 11
  },

  /* =================== FÊTES RELIGIEUSES (10) =================== */
  {
    slug: 'noel-classique', name: '🎄 Noël', description: 'Rouge, vert et or — neige animée',
    category: 'religious',
    colors: { primary: '#dc2626', secondary: '#16a34a', accent: '#fbbf24', bg: '#0a0e14', fg: '#ffffff' },
    decorations: { snow: true, stars: true },
    customCss: `body { background: radial-gradient(ellipse at top,#1a0e0a 0%,#0a0e14 70%); }`,
    autoActivate: true, daysBefore: 21, durationDays: 14, holidaySlug: 'noel', priority: 10
  },
  {
    slug: 'epiphanie', name: '👑 Épiphanie', description: 'Galette des rois (6 janvier)',
    category: 'religious',
    colors: { primary: '#fbbf24', secondary: '#92400e', accent: '#fde68a', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { stars: true },
    autoActivate: true, daysBefore: 5, durationDays: 3, holidaySlug: 'epiphanie', priority: 6
  },
  {
    slug: 'paques', name: '🐰 Pâques', description: 'Pastels printaniers + œufs animés',
    category: 'religious',
    colors: { primary: '#fbcfe8', secondary: '#bbf7d0', accent: '#fef08a', bg: '#0f0a14', fg: '#ffffff' },
    decorations: { eggs: true, petals: true },
    autoActivate: true, daysBefore: 7, durationDays: 5, holidaySlug: 'paques', priority: 9
  },
  {
    slug: 'pentecote', name: '🕊️ Pentecôte', description: 'Souffle de l\'Esprit — flammes orangées',
    category: 'religious',
    colors: { primary: '#f97316', secondary: '#dc2626', accent: '#fbbf24', bg: '#140a0a', fg: '#ffffff' },
    decorations: { stars: true },
    autoActivate: true, daysBefore: 3, durationDays: 3, holidaySlug: 'pentecote', priority: 7
  },
  {
    slug: 'pessah', name: '✡️ Pessah', description: 'Pâque juive — bleu et blanc',
    category: 'religious',
    colors: { primary: '#0038b8', secondary: '#ffffff', accent: '#3b82f6', bg: '#0a0e14', fg: '#ffffff' },
    decorations: { stars: true },
    autoActivate: true, daysBefore: 7, durationDays: 8, holidaySlug: 'pessah', priority: 9
  },
  {
    slug: 'rosh-hashana', name: '🍎 Roch Hachana', description: 'Nouvel An juif — pomme et miel',
    category: 'religious',
    colors: { primary: '#dc2626', secondary: '#fbbf24', accent: '#92400e', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { stars: true },
    autoActivate: true, daysBefore: 3, durationDays: 3, holidaySlug: 'rosh-hashana', priority: 7
  },
  {
    slug: 'hanouka', name: '🕎 Hanoukka', description: 'Lumières de la menorah — bleu et argent',
    category: 'religious',
    colors: { primary: '#0038b8', secondary: '#e2e8f0', accent: '#fbbf24', bg: '#0a0e14', fg: '#ffffff' },
    decorations: { stars: true, lanterns: true },
    autoActivate: true, daysBefore: 5, durationDays: 8, holidaySlug: 'hanouka', priority: 8
  },
  {
    slug: 'ramadan', name: '☪️ Ramadan', description: 'Vert et doré — croissant et lanternes',
    category: 'religious',
    colors: { primary: '#16a34a', secondary: '#fbbf24', accent: '#22c55e', bg: '#0a140e', fg: '#ffffff' },
    decorations: { lanterns: true, stars: true },
    autoActivate: true, daysBefore: 7, durationDays: 30, holidaySlug: 'ramadan', priority: 9
  },
  {
    slug: 'aid-fitr', name: '🌙 Aïd al-Fitr', description: 'Fête de fin du Ramadan',
    category: 'religious',
    colors: { primary: '#16a34a', secondary: '#fbbf24', accent: '#fef3c7', bg: '#0a140e', fg: '#ffffff' },
    decorations: { lanterns: true, confetti: true, stars: true },
    autoActivate: true, daysBefore: 3, durationDays: 3, holidaySlug: 'aid-fitr', priority: 9
  },
  {
    slug: 'diwali', name: '🪔 Diwali', description: 'Festival des lumières — orange, rose, or',
    category: 'religious',
    colors: { primary: '#f97316', secondary: '#ec4899', accent: '#fbbf24', bg: '#140a0e', fg: '#ffffff' },
    decorations: { lanterns: true, stars: true, confetti: true },
    autoActivate: true, daysBefore: 5, durationDays: 5, holidaySlug: 'diwali', priority: 8
  },

  /* =================== FÊTES NATIONALES (4) =================== */
  {
    slug: '14-juillet', name: '🇫🇷 14 Juillet', description: 'Bleu-blanc-rouge + feux d\'artifice',
    category: 'national',
    colors: { primary: '#0055a4', secondary: '#ef4135', accent: '#ffffff', bg: '#0a0e14', fg: '#ffffff' },
    decorations: { fireworks: true, stars: true },
    autoActivate: true, daysBefore: 3, durationDays: 2, holidaySlug: '14-juillet', geographicScope: 'FR', priority: 8
  },
  {
    slug: '4-juillet', name: '🇺🇸 4th of July', description: 'Stars and stripes',
    category: 'national',
    colors: { primary: '#bf0a30', secondary: '#002868', accent: '#ffffff', bg: '#0a0e14', fg: '#ffffff' },
    decorations: { fireworks: true, stars: true },
    autoActivate: true, daysBefore: 3, durationDays: 2, holidaySlug: '4-juillet', geographicScope: 'US', priority: 8
  },
  {
    slug: 'st-patrick', name: '☘️ Saint Patrick', description: 'Vert irlandais + trèfles',
    category: 'national',
    colors: { primary: '#16a34a', secondary: '#22c55e', accent: '#fbbf24', bg: '#0a140e', fg: '#ffffff' },
    decorations: { leaves: true, stars: true },
    autoActivate: true, daysBefore: 3, durationDays: 2, holidaySlug: 'st-patrick', priority: 7
  },
  {
    slug: 'cny', name: '🐉 Nouvel An chinois', description: 'Rouge et or impériaux',
    category: 'national',
    colors: { primary: '#dc2626', secondary: '#fbbf24', accent: '#fef3c7', bg: '#140a0a', fg: '#ffffff' },
    decorations: { lanterns: true, fireworks: true, confetti: true },
    autoActivate: true, daysBefore: 7, durationDays: 14, holidaySlug: 'cny', priority: 8
  },

  /* =================== AUTRES FÊTES (8) =================== */
  {
    slug: 'st-valentin', name: '💖 Saint Valentin', description: 'Rose et rouge — pluie de cœurs',
    category: 'holiday',
    colors: { primary: '#ec4899', secondary: '#dc2626', accent: '#fbcfe8', bg: '#140a0e', fg: '#ffffff' },
    decorations: { hearts: true },
    autoActivate: true, daysBefore: 5, durationDays: 2, holidaySlug: 'st-valentin', priority: 8
  },
  {
    slug: 'halloween', name: '🎃 Halloween', description: 'Orange et violet sombre',
    category: 'holiday',
    colors: { primary: '#f97316', secondary: '#7c3aed', accent: '#fbbf24', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { pumpkins: true, stars: true },
    customCss: `body { background: radial-gradient(ellipse at center,#1a0e14 0%,#0a0a14 70%); }
.gld-spook { animation: gld-flicker 2s infinite; }
@keyframes gld-flicker { 0%,100% { opacity: 1 } 50% { opacity: 0.7 } }`,
    autoActivate: true, daysBefore: 14, durationDays: 4, holidaySlug: 'halloween', priority: 9
  },
  {
    slug: 'mardi-gras', name: '🎭 Mardi Gras', description: 'Violet, vert, or — masques',
    category: 'holiday',
    colors: { primary: '#7c3aed', secondary: '#16a34a', accent: '#fbbf24', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { confetti: true, stars: true },
    autoActivate: true, daysBefore: 5, durationDays: 3, holidaySlug: 'mardi-gras', priority: 7
  },
  {
    slug: 'sakura', name: '🌸 Hanami / Cerisiers', description: 'Pétales roses au vent',
    category: 'seasonal',
    colors: { primary: '#fbcfe8', secondary: '#f9a8d4', accent: '#ffffff', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { petals: true },
    autoActivate: true, daysBefore: 7, durationDays: 21, holidaySlug: 'sakura', priority: 6
  },
  {
    slug: 'fete-musique', name: '🎵 Fête de la musique', description: '21 juin — couleurs vibrantes',
    category: 'holiday',
    colors: { primary: '#a855f7', secondary: '#ec4899', accent: '#06b6d4', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { confetti: true, stars: true },
    autoActivate: true, daysBefore: 3, durationDays: 2, holidaySlug: 'fete-musique', geographicScope: 'FR', priority: 7
  },
  {
    slug: 'jour-an', name: '🎆 Jour de l\'An', description: 'Argenté + feux d\'artifice',
    category: 'holiday',
    colors: { primary: '#fbbf24', secondary: '#e2e8f0', accent: '#a855f7', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { fireworks: true, confetti: true, stars: true },
    autoActivate: true, daysBefore: 3, durationDays: 3, holidaySlug: 'jour-an', priority: 9
  },
  {
    slug: 'octoberfest', name: '🍺 Oktoberfest', description: 'Bleu-blanc bavarois',
    category: 'holiday',
    colors: { primary: '#fbbf24', secondary: '#0055a4', accent: '#ffffff', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { confetti: true },
    autoActivate: true, daysBefore: 5, durationDays: 16, holidaySlug: 'octoberfest', geographicScope: 'DE', priority: 5
  },
  {
    slug: 'toussaint', name: '🕯️ Toussaint', description: 'Sobre — violet et blanc',
    category: 'religious',
    colors: { primary: '#7c3aed', secondary: '#e2e8f0', accent: '#a78bfa', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { stars: true },
    autoActivate: true, daysBefore: 2, durationDays: 2, holidaySlug: 'toussaint', priority: 5
  },

  /* =================== ESTHÉTIQUES PERMANENTES (27) =================== */
  {
    slug: 'neon-cathedral', name: '⛪ Neon Cathedral', description: 'Le thème par défaut GLD — violet/cyan/rose néon',
    category: 'aesthetic',
    colors: { primary: '#d61b80', secondary: '#7c3aed', accent: '#06b6d4', bg: '#0a0a0e', fg: '#ffffff' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'cyberpunk', name: '🤖 Cyberpunk 2077', description: 'Jaune néon + cyan magenta sur noir profond',
    category: 'aesthetic',
    colors: { primary: '#fcee0a', secondary: '#ff003c', accent: '#00f0ff', bg: '#000000', fg: '#fcee0a' },
    customCss: `body { font-family: 'Courier New', monospace; }
.gld-glitch { text-shadow: 2px 0 #ff003c, -2px 0 #00f0ff; }`,
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'vaporwave', name: '🌴 Vaporwave', description: 'Pink + cyan + grille rétro',
    category: 'aesthetic',
    colors: { primary: '#ff71ce', secondary: '#01cdfe', accent: '#b967ff', bg: '#1a0033', fg: '#ffffff' },
    customCss: `body { background: linear-gradient(180deg,#1a0033 0%,#5e0a8b 50%,#ff71ce 100%); }`,
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'synthwave', name: '🌅 Synthwave', description: 'Coucher de soleil 80s grille néon',
    category: 'aesthetic',
    colors: { primary: '#ff006e', secondary: '#fb5607', accent: '#ffbe0b', bg: '#03071e', fg: '#ffffff' },
    customCss: `body { background: linear-gradient(180deg,#03071e 0%,#370617 60%,#9d0208 100%); }`,
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'pastel-dream', name: '🦄 Pastel Dream', description: 'Pastels doux — lavande, menthe, pêche',
    category: 'aesthetic',
    colors: { primary: '#c4b5fd', secondary: '#a7f3d0', accent: '#fed7aa', bg: '#1e1b3a', fg: '#f5f3ff' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'dark-academia', name: '📚 Dark Academia', description: 'Brun, bordeaux, parchemin',
    category: 'aesthetic',
    colors: { primary: '#92400e', secondary: '#7f1d1d', accent: '#fef3c7', bg: '#1c1917', fg: '#fef3c7' },
    fonts: { display: 'Playfair Display, serif', body: 'Cormorant Garamond, serif' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'y2k', name: '✨ Y2K', description: 'Métallisé bubble-gum 2000s',
    category: 'aesthetic',
    colors: { primary: '#ff10f0', secondary: '#00d9ff', accent: '#c0c0c0', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { diamonds: true, stars: true },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'aurora-borealis', name: '🌌 Aurore boréale', description: 'Vert/violet glaciaire',
    category: 'aesthetic',
    colors: { primary: '#10b981', secondary: '#7c3aed', accent: '#06b6d4', bg: '#020617', fg: '#ffffff' },
    customCss: `body { background: linear-gradient(180deg,#020617 0%,#064e3b 50%,#020617 100%); }`,
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'ocean-deep', name: '🌊 Océan Profond', description: 'Bleus marins',
    category: 'aesthetic',
    colors: { primary: '#0284c7', secondary: '#0e7490', accent: '#06b6d4', bg: '#082f49', fg: '#e0f2fe' },
    decorations: { bubbles: true },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'forest-mystic', name: '🌲 Forêt mystique', description: 'Vert sombre + brume',
    category: 'aesthetic',
    colors: { primary: '#16a34a', secondary: '#365314', accent: '#84cc16', bg: '#0a140e', fg: '#dcfce7' },
    decorations: { leaves: true },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'desert-sunset', name: '🏜️ Coucher désert', description: 'Orange + sable',
    category: 'aesthetic',
    colors: { primary: '#ea580c', secondary: '#92400e', accent: '#fbbf24', bg: '#1c1917', fg: '#fef3c7' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'cosmic', name: '🌠 Cosmique', description: 'Galaxie violette + étoiles',
    category: 'aesthetic',
    colors: { primary: '#a855f7', secondary: '#ec4899', accent: '#fbbf24', bg: '#0a0014', fg: '#ffffff' },
    decorations: { stars: true },
    customCss: `body { background: radial-gradient(ellipse at center,#1a0033 0%,#0a0014 70%); }`,
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'cherry-blossom', name: '🌸 Cherry Blossom', description: 'Rose pâle minimaliste',
    category: 'aesthetic',
    colors: { primary: '#fbcfe8', secondary: '#f9a8d4', accent: '#ec4899', bg: '#1f0a14', fg: '#ffffff' },
    decorations: { petals: true },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'lavender-field', name: '💜 Champ de lavande', description: 'Mauve provençal',
    category: 'aesthetic',
    colors: { primary: '#a78bfa', secondary: '#c4b5fd', accent: '#fbbf24', bg: '#1e1b3a', fg: '#ffffff' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'coral-reef', name: '🐠 Récif corallien', description: 'Corail + turquoise',
    category: 'aesthetic',
    colors: { primary: '#fb7185', secondary: '#06b6d4', accent: '#fbbf24', bg: '#0a1f2a', fg: '#ffffff' },
    decorations: { bubbles: true },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'galaxy-purple', name: '🪐 Galaxy Purple', description: 'Violet profond + nébuleuses',
    category: 'aesthetic',
    colors: { primary: '#9333ea', secondary: '#3730a3', accent: '#ec4899', bg: '#0a0014', fg: '#ffffff' },
    decorations: { stars: true },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'rose-gold', name: '🌹 Rose Gold', description: 'Or rose élégant',
    category: 'aesthetic',
    colors: { primary: '#e8b4b8', secondary: '#a16d6d', accent: '#fbbf24', bg: '#1a0e14', fg: '#fef3c7' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'midnight-blue', name: '🌃 Midnight Blue', description: 'Nuit bleu marine',
    category: 'aesthetic',
    colors: { primary: '#3b82f6', secondary: '#1e40af', accent: '#fbbf24', bg: '#0a0e14', fg: '#dbeafe' },
    decorations: { stars: true },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'sunset-beach', name: '🏖️ Plage au coucher', description: 'Orange/rose tropical',
    category: 'aesthetic',
    colors: { primary: '#f97316', secondary: '#ec4899', accent: '#fbbf24', bg: '#1a0e0a', fg: '#fef3c7' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'mint-fresh', name: '🌿 Menthe fraîche', description: 'Vert pastel apaisant',
    category: 'aesthetic',
    colors: { primary: '#6ee7b7', secondary: '#34d399', accent: '#a7f3d0', bg: '#0a1a14', fg: '#d1fae5' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'monochrome', name: '⚫ Monochrome', description: 'Noir, blanc, gris purs',
    category: 'aesthetic',
    colors: { primary: '#ffffff', secondary: '#a3a3a3', accent: '#737373', bg: '#000000', fg: '#ffffff' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'liquid-lava', name: '🔥 Lave liquide', description: 'Rouge orangé incandescent',
    category: 'aesthetic',
    colors: { primary: '#dc2626', secondary: '#ea580c', accent: '#fbbf24', bg: '#170a0a', fg: '#fef3c7' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'glacier', name: '🧊 Glacier', description: 'Bleu glace cristallin',
    category: 'aesthetic',
    colors: { primary: '#7dd3fc', secondary: '#bae6fd', accent: '#ffffff', bg: '#0a1a2a', fg: '#e0f2fe' },
    decorations: { snow: true },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'jungle-tropical', name: '🌴 Jungle tropicale', description: 'Vert vif + fleurs exotiques',
    category: 'aesthetic',
    colors: { primary: '#16a34a', secondary: '#fb7185', accent: '#fbbf24', bg: '#0a140e', fg: '#dcfce7' },
    decorations: { leaves: true },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'gothic-cathedrale', name: '🦇 Gothique cathédrale', description: 'Violet sombre + vitraux',
    category: 'aesthetic',
    colors: { primary: '#7c3aed', secondary: '#dc2626', accent: '#fbbf24', bg: '#050008', fg: '#e9d5ff' },
    fonts: { display: 'UnifrakturCook, cursive' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'rainbow-pop', name: '🌈 Rainbow Pop', description: 'Toutes les couleurs en confettis',
    category: 'aesthetic',
    colors: { primary: '#ec4899', secondary: '#06b6d4', accent: '#fbbf24', bg: '#0a0a14', fg: '#ffffff' },
    decorations: { rainbow: true, confetti: true, hearts: true, stars: true },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'minimal-light', name: '⚪ Minimal Light', description: 'Blanc minimaliste épuré',
    category: 'aesthetic',
    colors: { primary: '#171717', secondary: '#525252', accent: '#dc2626', bg: '#fafafa', fg: '#171717', surface: '#ffffff', border: '#e5e5e5' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  },
  {
    slug: 'sepia-vintage', name: '📷 Sépia vintage', description: 'Photo ancienne — brun crème',
    category: 'aesthetic',
    colors: { primary: '#92400e', secondary: '#78350f', accent: '#fed7aa', bg: '#1c1310', fg: '#fef3c7' },
    autoActivate: false, daysBefore: 0, durationDays: 0
  }
];

export const TOTAL_THEMES = THEMES_SEED.length;
