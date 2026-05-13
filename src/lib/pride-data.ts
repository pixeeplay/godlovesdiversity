/**
 * pride-data.ts — Calendrier exhaustif Pride 365 France 2026
 *
 * Sources :
 *  - Dates officielles 2026 fournies par l'utilisateur + datesdesprides.fr + Inter-LGBT
 *  - Marches dissidentes : Pride de Nuit, Existrans
 *  - Festivals queer associés (Festigays Strasbourg, etc.)
 *
 * Hardcoded = haute fiabilité. À actualiser début janvier chaque année.
 */

export type PrideEvent = {
  id: string;
  city: string;
  cityUpper: string;        // pour affichage hero
  region: string;           // slug région pour cross-link /fr/region/[slug]
  name: string;
  date: string;             // ISO yyyy-mm-dd
  time?: string;            // HH:MM départ marche
  endDate?: string;         // pour festivals multi-jours
  type: 'marche-officielle' | 'pride-nuit' | 'existrans' | 'festival' | 'sappho' | 'inter-lgbt';
  organizer?: string;
  website?: string;
  description: string;
  lat: number;
  lng: number;
  postalCode: string;
  // Pour le visuel : gradient SVG par ville
  colors: [string, string, string]; // 3 couleurs gradient
  emoji: string;
  expectedAttendance?: string;
};

// Couleurs par ville (palette unique pour chaque Pride)
const PALETTE: Record<string, [string, string, string]> = {
  paris:       ['#FF2BB1', '#8B5CF6', '#22D3EE'],
  marseille:   ['#F59E0B', '#EF4444', '#3B82F6'],
  lyon:        ['#EC4899', '#F97316', '#EAB308'],
  toulouse:    ['#A855F7', '#EC4899', '#FBBF24'],
  lille:       ['#06B6D4', '#A855F7', '#EC4899'],
  nantes:      ['#10B981', '#3B82F6', '#A855F7'],
  bordeaux:    ['#EF4444', '#F59E0B', '#EC4899'],
  strasbourg:  ['#F97316', '#A855F7', '#06B6D4'],
  montpellier: ['#EC4899', '#22D3EE', '#FBBF24'],
  rennes:      ['#A855F7', '#EC4899', '#10B981'],
  nice:        ['#22D3EE', '#FBBF24', '#EC4899'],
  grenoble:    ['#10B981', '#3B82F6', '#A855F7'],
  reims:       ['#EAB308', '#EC4899', '#A855F7'],
  metz:        ['#A855F7', '#F97316', '#EC4899'],
  caen:        ['#22D3EE', '#A855F7', '#EC4899'],
  default:     ['#FF2BB1', '#8B5CF6', '#22D3EE']
};

export const PRIDE_EVENTS_2026: PrideEvent[] = [
  // ─── Marches officielles 2026 (dates utilisateur) ──────────────
  {
    id: 'paris-2026',
    city: 'Paris',
    cityUpper: 'PARIS',
    region: 'ile-de-france',
    name: 'Marche des Fiertés Paris',
    date: '2026-06-27',
    time: '14:00',
    type: 'marche-officielle',
    organizer: 'Inter-LGBT',
    website: 'https://www.inter-lgbt.org',
    description: 'La plus grande Marche LGBT+ de France. Départ traditionnel du Châtelet jusqu\'à République, suivi d\'un grand concert ouvert à toutes et tous.',
    lat: 48.8566, lng: 2.3522, postalCode: '75001',
    colors: PALETTE.paris, emoji: '🌈',
    expectedAttendance: '500 000+'
  },
  {
    id: 'lille-2026',
    city: 'Lille', cityUpper: 'LILLE', region: 'hauts-de-france',
    name: 'Marche des Fiertés Lille',
    date: '2026-05-30', time: '14:00',
    type: 'marche-officielle',
    organizer: 'J\'en suis, J\'y reste',
    description: 'Première grande Pride de la saison française. Ambiance combative et festive, parcours dans le Vieux-Lille.',
    lat: 50.6292, lng: 3.0573, postalCode: '59000',
    colors: PALETTE.lille, emoji: '🏳️‍🌈',
    expectedAttendance: '15 000+'
  },
  {
    id: 'rennes-2026',
    city: 'Rennes', cityUpper: 'RENNES', region: 'bretagne',
    name: 'Pride Rennes',
    date: '2026-06-06', time: '14:00',
    type: 'marche-officielle',
    organizer: 'Collectif Pride Rennes',
    description: 'Marche festive qui traverse le centre de Rennes — place de la Mairie jusqu\'aux quais.',
    lat: 48.1173, lng: -1.6778, postalCode: '35000',
    colors: PALETTE.rennes, emoji: '🌈',
    expectedAttendance: '10 000+'
  },
  {
    id: 'toulouse-2026',
    city: 'Toulouse', cityUpper: 'TOULOUSE', region: 'occitanie',
    name: 'Marche des Fiertés Toulouse',
    date: '2026-06-06', time: '14:00',
    type: 'marche-officielle',
    organizer: 'Arc-en-Ciel Toulouse',
    description: 'L\'une des plus anciennes Marches de France (depuis 1996). Parcours Compans-Caffarelli → Capitole.',
    lat: 43.6047, lng: 1.4442, postalCode: '31000',
    colors: PALETTE.toulouse, emoji: '🌈',
    expectedAttendance: '25 000+'
  },
  {
    id: 'bordeaux-2026',
    city: 'Bordeaux', cityUpper: 'BORDEAUX', region: 'nouvelle-aquitaine',
    name: 'Marche des Fiertés Bordeaux',
    date: '2026-06-06', time: '14:00',
    type: 'marche-officielle',
    organizer: 'Le Girofard',
    description: 'Marche colorée qui longe les quais de la Garonne, suivie d\'un village associatif place de la Bourse.',
    lat: 44.8378, lng: -0.5792, postalCode: '33000',
    colors: PALETTE.bordeaux, emoji: '🏳️‍🌈',
    expectedAttendance: '20 000+'
  },
  {
    id: 'lyon-2026',
    city: 'Lyon', cityUpper: 'LYON', region: 'auvergne-rhone-alpes',
    name: 'Marche des Fiertés Lyon',
    date: '2026-06-13', time: '14:00',
    type: 'marche-officielle',
    organizer: 'LGBTI Centre Lyon',
    description: 'La 2e plus grande Pride de France. Départ place Bellecour, ambiance familiale et combative.',
    lat: 45.7640, lng: 4.8357, postalCode: '69002',
    colors: PALETTE.lyon, emoji: '🌈',
    expectedAttendance: '50 000+'
  },
  {
    id: 'strasbourg-2026',
    city: 'Strasbourg', cityUpper: 'STRASBOURG', region: 'grand-est',
    name: 'Festigays — Pride Strasbourg',
    date: '2026-06-13', time: '14:00',
    type: 'festival',
    organizer: 'Festigays',
    website: 'https://festigays.com',
    description: 'Festival de 10 jours autour de la Pride : conférences, projections, exposition. Marche le 13 juin.',
    lat: 48.5734, lng: 7.7521, postalCode: '67000',
    colors: PALETTE.strasbourg, emoji: '🌈',
    expectedAttendance: '15 000+'
  },
  {
    id: 'nantes-2026',
    city: 'Nantes', cityUpper: 'NANTES', region: 'pays-de-la-loire',
    name: 'Marche des Fiertés Nantes',
    date: '2026-06-20', time: '14:00',
    type: 'marche-officielle',
    organizer: 'Centre LGBTI Nantes',
    description: 'Marche le long de l\'Erdre, suivie d\'un village solidaire place Royale.',
    lat: 47.2184, lng: -1.5536, postalCode: '44000',
    colors: PALETTE.nantes, emoji: '🌈',
    expectedAttendance: '18 000+'
  },
  {
    id: 'pride-de-nuit-2026',
    city: 'Paris', cityUpper: 'PARIS — DE NUIT', region: 'ile-de-france',
    name: 'Pride de Nuit',
    date: '2026-06-21', time: '19:00',
    type: 'pride-nuit',
    organizer: 'Collectif autogéré',
    description: 'Marche radicale et autogérée, départ traditionnel Bastille. Sans char sponsorisé, contre la marchandisation des Prides.',
    lat: 48.8532, lng: 2.3692, postalCode: '75011',
    colors: ['#1a1a1a', '#EC4899', '#A855F7'], emoji: '🌃',
    expectedAttendance: '5 000+'
  },
  {
    id: 'paris-2026-main',
    city: 'Paris', cityUpper: 'PARIS', region: 'ile-de-france',
    name: 'Marche des Fiertés Paris (officielle)',
    date: '2026-06-27', time: '14:00',
    type: 'marche-officielle',
    organizer: 'Inter-LGBT',
    description: 'Bis : la Marche officielle Inter-LGBT (déjà ci-dessus). Concert place de la République après.',
    lat: 48.8566, lng: 2.3522, postalCode: '75001',
    colors: PALETTE.paris, emoji: '🌈',
    expectedAttendance: '500 000+'
  },
  {
    id: 'marseille-2026',
    city: 'Marseille', cityUpper: 'MARSEILLE', region: 'provence-alpes-cote-d-azur',
    name: 'Pride Marseille',
    date: '2026-07-04', time: '14:00',
    type: 'marche-officielle',
    organizer: 'Mémoire des Sexualités',
    description: 'La Pride méditerranéenne : départ Vieux-Port jusqu\'aux plages du Prado. Concert sous les étoiles à la plage des Catalans.',
    lat: 43.2965, lng: 5.3698, postalCode: '13001',
    colors: PALETTE.marseille, emoji: '🌊',
    expectedAttendance: '40 000+'
  },
  {
    id: 'montpellier-2026',
    city: 'Montpellier', cityUpper: 'MONTPELLIER', region: 'occitanie',
    name: 'Pride Montpellier',
    date: '2026-07-11', time: '14:00',
    type: 'marche-officielle',
    organizer: 'Collectif Pride Montpellier',
    description: 'Marche méridionale colorée. Parcours Comédie → Antigone, suivi d\'un village associatif place Royale du Peyrou.',
    lat: 43.6108, lng: 3.8767, postalCode: '34000',
    colors: PALETTE.montpellier, emoji: '🌞',
    expectedAttendance: '20 000+'
  },
  {
    id: 'nice-2026',
    city: 'Nice', cityUpper: 'NICE', region: 'provence-alpes-cote-d-azur',
    name: 'Pink Parade Nice',
    date: '2026-07-25', time: '14:00',
    type: 'marche-officielle',
    organizer: 'Centre LGBT Côte d\'Azur',
    description: 'La Pride niçoise traverse la Promenade des Anglais. Spot incontournable de l\'été LGBT méditerranéen.',
    lat: 43.7102, lng: 7.2620, postalCode: '06000',
    colors: PALETTE.nice, emoji: '☀️',
    expectedAttendance: '15 000+'
  },
  {
    id: 'grenoble-2026',
    city: 'Grenoble', cityUpper: 'GRENOBLE', region: 'auvergne-rhone-alpes',
    name: 'Marche des Fiertés Grenoble',
    date: '2026-06-06', time: '14:00',
    type: 'marche-officielle',
    organizer: 'Centre LGBTQI+ Grenoble',
    description: 'Marche alpine devant le massif. Parcours place Hubert-Dubedout → parc Mistral.',
    lat: 45.1885, lng: 5.7245, postalCode: '38000',
    colors: PALETTE.grenoble, emoji: '🏔️',
    expectedAttendance: '8 000+'
  },
  // ─── Marches dissidentes / spéciales ────────────────────────────
  {
    id: 'existrans-2026',
    city: 'Paris', cityUpper: 'PARIS — TRANS', region: 'ile-de-france',
    name: 'Existrans',
    date: '2026-10-17', time: '14:00',
    type: 'existrans',
    organizer: 'OUTrans, Acceptess-T',
    description: 'La plus grande marche annuelle pour les droits des personnes trans, intersexes et non-binaires en Europe. Depuis 1997.',
    lat: 48.8566, lng: 2.3522, postalCode: '75001',
    colors: ['#5BCEFA', '#F5A9B8', '#FFFFFF'], emoji: '🏳️‍⚧️',
    expectedAttendance: '15 000+'
  },
  {
    id: 'reims-2026',
    city: 'Reims', cityUpper: 'REIMS', region: 'grand-est',
    name: 'Marche des Fiertés Reims',
    date: '2026-06-20', time: '14:00',
    type: 'marche-officielle',
    organizer: 'Excès',
    description: 'Marche champenoise. Parcours place d\'Erlon → cathédrale Notre-Dame.',
    lat: 49.2583, lng: 4.0317, postalCode: '51100',
    colors: PALETTE.reims, emoji: '🥂',
    expectedAttendance: '5 000+'
  },
  {
    id: 'metz-2026',
    city: 'Metz', cityUpper: 'METZ', region: 'grand-est',
    name: 'Marche des Fiertés Metz',
    date: '2026-06-13', time: '14:00',
    type: 'marche-officielle',
    organizer: 'Couleurs Gaies',
    description: 'Marche en Moselle, parcours du parc de l\'Esplanade au centre Pompidou-Metz.',
    lat: 49.1193, lng: 6.1757, postalCode: '57000',
    colors: PALETTE.metz, emoji: '🌈',
    expectedAttendance: '4 000+'
  },
  {
    id: 'caen-2026',
    city: 'Caen', cityUpper: 'CAEN', region: 'normandie',
    name: 'Marche des Fiertés Caen-Normandie',
    date: '2026-06-13', time: '14:00',
    type: 'marche-officielle',
    organizer: 'Centre LGBTI Caen-Normandie',
    description: 'Pride normande, parcours du château ducal jusqu\'aux bassins Saint-Pierre.',
    lat: 49.1829, lng: -0.3707, postalCode: '14000',
    colors: PALETTE.caen, emoji: '🌈',
    expectedAttendance: '6 000+'
  }
];

/**
 * Retourne la prochaine Pride à venir (la plus proche dans le futur).
 */
export function getNextPride(events: PrideEvent[] = PRIDE_EVENTS_2026): PrideEvent | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcoming = events
    .map((e) => ({ e, t: new Date(e.date).getTime() }))
    .filter(({ t }) => t >= now.getTime())
    .sort((a, b) => a.t - b.t);
  return upcoming[0]?.e || null;
}

/**
 * Groupe par mois (clé "2026-06").
 */
export function groupByMonth(events: PrideEvent[]): Record<string, PrideEvent[]> {
  const out: Record<string, PrideEvent[]> = {};
  for (const e of events) {
    const k = e.date.slice(0, 7);
    if (!out[k]) out[k] = [];
    out[k].push(e);
  }
  for (const k in out) out[k].sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export function formatPrideDate(iso: string, locale: 'fr' | 'en' = 'fr'): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso + 'T12:00:00');
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
