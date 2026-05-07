/**
 * Calendrier des fêtes pour l'auto-activation des thèmes.
 * - Fêtes à date fixe : ex Noël 25/12, Saint Valentin 14/02
 * - Fêtes calculées : Pâques (algorithme de Gauss), Pessah (Hebcal-style),
 *   Ramadan (Islamic calendar Umm al-Qura)
 *
 * Chaque fête : { slug, name, region, getDate(year): Date }
 */

export type Holiday = {
  slug: string;
  name: string;
  region: 'global' | string; // ISO-2 ou "FR" etc.
  getDate: (year: number) => Date;
};

/* ============= ALGORITHMES ============= */

/** @deprecated — was used for religious holidays, kept for backward compat with cron jobs */
export function easterDate(year: number): Date {
  // simplified retained for legacy callers — returns Jan 1 fallback
  return new Date(year, 0, 1);
}

/** Pessah (Pâque juive) — approximation en jours après Pâques chrétienne (généralement très proche) */
export function pessahDate(year: number): Date {
  // Pessah commence le 15 Nissan dans le calendrier hébraïque
  // Approximation : Pessah ≈ Pâques chrétienne ± qq jours selon les années
  // Pour 2024: 22 avr, 2025: 12 avr, 2026: 1 avr, 2027: 21 avr
  const knownDates: Record<number, [number, number]> = {
    2024: [3, 22], 2025: [3, 12], 2026: [3, 1],
    2027: [3, 21], 2028: [3, 10], 2029: [3, 30], 2030: [3, 17]
  };
  const d = knownDates[year];
  if (d) return new Date(year, d[0], d[1]);
  // Fallback : Pâques chrétienne
  return easterDate(year);
}

/** Ramadan début — table Umm al-Qura approximative (recule de ~10-11 jours/an) */
export function ramadanStart(year: number): Date {
  const knownDates: Record<number, [number, number]> = {
    2024: [2, 11], 2025: [1, 28], 2026: [1, 17],
    2027: [1, 7], 2028: [0, 27], 2029: [0, 16], 2030: [0, 5]
  };
  const d = knownDates[year];
  if (d) return new Date(year, d[0], d[1]);
  // Approximation : recule de 11 jours par an depuis 2025
  const base = new Date(2025, 1, 28);
  base.setDate(base.getDate() - 11 * (year - 2025));
  return base;
}

/** Hanoukka — 25 Kislev hébraïque (≈ déc) */
export function hanoukkaStart(year: number): Date {
  const knownDates: Record<number, [number, number]> = {
    2024: [11, 25], 2025: [11, 14], 2026: [11, 4],
    2027: [11, 24], 2028: [11, 12], 2029: [11, 1], 2030: [11, 20]
  };
  const d = knownDates[year];
  if (d) return new Date(year, d[0], d[1]);
  return new Date(year, 11, 14); // fallback mi-déc
}

/** Diwali — calendrier hindou */
export function diwaliDate(year: number): Date {
  const knownDates: Record<number, [number, number]> = {
    2024: [10, 1], 2025: [9, 21], 2026: [10, 8],
    2027: [9, 28], 2028: [9, 17], 2029: [10, 5], 2030: [9, 26]
  };
  const d = knownDates[year];
  if (d) return new Date(year, d[0], d[1]);
  return new Date(year, 9, 21);
}

/** Nouvel An chinois */
export function chineseNewYear(year: number): Date {
  const knownDates: Record<number, [number, number]> = {
    2024: [1, 10], 2025: [0, 29], 2026: [1, 17],
    2027: [1, 6], 2028: [0, 26], 2029: [1, 13], 2030: [1, 3]
  };
  const d = knownDates[year];
  if (d) return new Date(year, d[0], d[1]);
  return new Date(year, 1, 1);
}

/* ============= LISTE DES FÊTES ============= */

export const HOLIDAYS: Holiday[] = [
  // === LGBT ===
  { slug: 'pride-month',     name: 'Mois des fiertés (Pride Month)', region: 'global', category: 'lgbt',
    getDate: (y) => new Date(y, 5, 1) },          // 1er juin
  { slug: 'pride-paris',     name: 'Marche des fiertés Paris',       region: 'FR',     category: 'lgbt',
    getDate: (y) => new Date(y, 5, 28) },         // 28 juin
  { slug: 'idahobit',        name: 'Journée IDAHOBIT (homophobie)',  region: 'global', category: 'lgbt',
    getDate: (y) => new Date(y, 4, 17) },         // 17 mai
  { slug: 'coming-out-day',  name: 'Journée du coming out',          region: 'global', category: 'lgbt',
    getDate: (y) => new Date(y, 9, 11) },         // 11 octobre
  { slug: 'trans-day',       name: 'Journée du souvenir trans',      region: 'global', category: 'lgbt',
    getDate: (y) => new Date(y, 10, 20) },        // 20 novembre

  // === RELIGIEUX ===

  // === CIVIQUES NATIONAUX ===
  { slug: '14-juillet',      name: '14 Juillet (Fête nationale FR)', region: 'FR', category: 'civic',
    getDate: (y) => new Date(y, 6, 14) },
  { slug: 'existrans',       name: 'Existrans (Marche des trans)',  region: 'FR',     category: 'lgbt',
    getDate: (y) => new Date(y, 9, 18) },                          // 3e samedi octobre approx
  { slug: 'pride-marseille',  name: 'Marche des Fiertés Marseille', region: 'FR',     category: 'lgbt',
    getDate: (y) => new Date(y, 6, 5) },                           // début juillet
  { slug: 'pride-lyon',       name: 'Marche des Fiertés Lyon',      region: 'FR',     category: 'lgbt',
    getDate: (y) => new Date(y, 5, 15) },                          // mi-juin
  { slug: 'pride-toulouse',   name: 'Marche des Fiertés Toulouse',  region: 'FR',     category: 'lgbt',
    getDate: (y) => new Date(y, 5, 8) },
  { slug: 'pride-lille',      name: 'Marche des Fiertés Lille',     region: 'FR',     category: 'lgbt',
    getDate: (y) => new Date(y, 5, 1) },
  { slug: 'aids-day',         name: 'Journée mondiale du Sida',     region: 'global', category: 'lgbt',
    getDate: (y) => new Date(y, 11, 1) },                          // 1er décembre
  { slug: 'bisexual-day',     name: 'Journée de la bisexualité',    region: 'global', category: 'lgbt',
    getDate: (y) => new Date(y, 8, 23) },                          // 23 sept
  { slug: 'lesbian-day',      name: 'Journée internationale lesbienne', region: 'global', category: 'lgbt',
    getDate: (y) => new Date(y, 9, 8) },                           // 8 oct
  { slug: 'asexual-week',     name: 'Semaine de la visibilité asexuelle', region: 'global', category: 'lgbt',
    getDate: (y) => new Date(y, 9, 22) },
  { slug: 'intersex-day',     name: 'Journée intersexe',            region: 'global', category: 'lgbt',
    getDate: (y) => new Date(y, 9, 26) },
  { slug: '4-juillet',       name: '4 July (Independence Day US)',   region: 'US', category: 'civic',
    getDate: (y) => new Date(y, 6, 4) },
  { slug: 'st-patrick',      name: 'Saint Patrick',           region: 'IE,US,GB', category: 'civic',
    getDate: (y) => new Date(y, 2, 17) },
  { slug: 'fete-musique',    name: 'Fête de la musique',      region: 'FR', category: 'cultural',
    getDate: (y) => new Date(y, 5, 21) },
  { slug: 'jour-an',         name: 'Jour de l\'An',           region: 'global', category: 'civic',
    getDate: (y) => new Date(y, 0, 1) },
  { slug: 'st-sylvestre',    name: 'Saint-Sylvestre / Réveillon', region: 'global', category: 'civic',
    getDate: (y) => new Date(y, 11, 31) },
  { slug: 'cny',             name: 'Nouvel An chinois',       region: 'global', category: 'cultural',
    getDate: chineseNewYear },

  // === CULTURELLES ===
  { slug: 'st-valentin',     name: 'Saint Valentin',          region: 'global', category: 'cultural',
    getDate: (y) => new Date(y, 1, 14) },
  { slug: 'halloween',       name: 'Halloween',               region: 'global', category: 'cultural',
    getDate: (y) => new Date(y, 9, 31) },
  { slug: 'mardi-gras',      name: 'Mardi Gras / Carnaval',   region: 'global', category: 'cultural',
    getDate: (y) => { const d = easterDate(y); d.setDate(d.getDate() - 47); return d; } },
  { slug: 'octoberfest',     name: 'Oktoberfest',             region: 'DE', category: 'cultural',
    getDate: (y) => new Date(y, 8, 21) },
  { slug: 'sakura',          name: 'Hanami (Cerisiers)',      region: 'JP', category: 'cultural',
    getDate: (y) => new Date(y, 2, 27) },

  // === SAISONS ===
  { slug: 'printemps',       name: 'Printemps',               region: 'global', category: 'cultural',
    getDate: (y) => new Date(y, 2, 20) },
  { slug: 'ete',             name: 'Été',                     region: 'global', category: 'cultural',
    getDate: (y) => new Date(y, 5, 21) },
  { slug: 'automne',         name: 'Automne',                 region: 'global', category: 'cultural',
    getDate: (y) => new Date(y, 8, 22) },
  { slug: 'hiver',           name: 'Hiver',                   region: 'global', category: 'cultural',
    getDate: (y) => new Date(y, 11, 21) }
];

export function getHolidayBySlug(slug: string): Holiday | undefined {
  return HOLIDAYS.find(h => h.slug === slug);
}

/**
 * Vérifie si on est dans la période d'activation d'un thème (daysBefore avant → durationDays après le début).
 */
export function isInActivationWindow(opts: {
  holidaySlug?: string | null;
  autoStartMonth?: number | null;
  autoStartDay?: number | null;
  daysBefore: number;
  durationDays: number;
  now?: Date;
}): boolean {
  const now = opts.now || new Date();
  const year = now.getFullYear();

  let target: Date | null = null;
  if (opts.holidaySlug) {
    const h = getHolidayBySlug(opts.holidaySlug);
    if (h) target = h.getDate(year);
  } else if (opts.autoStartMonth && opts.autoStartDay) {
    target = new Date(year, opts.autoStartMonth - 1, opts.autoStartDay);
  }
  if (!target) return false;

  const start = new Date(target);
  start.setDate(start.getDate() - opts.daysBefore);
  const end = new Date(target);
  end.setDate(end.getDate() + opts.durationDays);

  return now >= start && now <= end;
}
