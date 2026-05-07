/**
 * SVG flags for LGBTQIA+ identities and orientations.
 * Each flag is a small SVG (60x36 viewBox) for inline embedding.
 *
 * Used by:
 * - /[locale]/identites — public glossary
 * - /admin/identities — back-office editor
 * - <IdentityChip /> component — wherever an identity tag is shown
 */

export type FlagSlug =
  | 'rainbow'
  | 'lesbian'
  | 'gay'
  | 'bi'
  | 'trans'
  | 'nb'
  | 'queer'
  | 'ace'
  | 'pan'
  | 'intersex'
  | 'progress';

export const FLAGS: Record<FlagSlug, string> = {
  rainbow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" preserveAspectRatio="none"><rect width="60" height="6" y="0"  fill="#e40303"/><rect width="60" height="6" y="6"  fill="#ff8c00"/><rect width="60" height="6" y="12" fill="#ffed00"/><rect width="60" height="6" y="18" fill="#008026"/><rect width="60" height="6" y="24" fill="#004dff"/><rect width="60" height="6" y="30" fill="#750787"/></svg>`,
  gay: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" preserveAspectRatio="none"><rect width="60" height="36" fill="#078d70"/><rect width="60" height="6" y="0"  fill="#078d70"/><rect width="60" height="6" y="6"  fill="#26ceaa"/><rect width="60" height="6" y="12" fill="#98e8c1"/><rect width="60" height="6" y="18" fill="#ffffff"/><rect width="60" height="6" y="24" fill="#7bade2"/><rect width="60" height="6" y="30" fill="#3d1a78"/></svg>`,
  lesbian: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" preserveAspectRatio="none"><rect width="60" height="6" y="0"  fill="#d52d00"/><rect width="60" height="6" y="6"  fill="#ef7627"/><rect width="60" height="6" y="12" fill="#ff9a56"/><rect width="60" height="6" y="18" fill="#ffffff"/><rect width="60" height="6" y="24" fill="#d362a4"/><rect width="60" height="6" y="30" fill="#a30262"/></svg>`,
  bi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" preserveAspectRatio="none"><rect width="60" height="14.4" y="0"   fill="#d60270"/><rect width="60" height="7.2" y="14.4" fill="#9b4f96"/><rect width="60" height="14.4" y="21.6" fill="#0038a8"/></svg>`,
  trans: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" preserveAspectRatio="none"><rect width="60" height="7.2" y="0"    fill="#5bcefa"/><rect width="60" height="7.2" y="7.2"  fill="#f5a9b8"/><rect width="60" height="7.2" y="14.4" fill="#ffffff"/><rect width="60" height="7.2" y="21.6" fill="#f5a9b8"/><rect width="60" height="7.2" y="28.8" fill="#5bcefa"/></svg>`,
  nb: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" preserveAspectRatio="none"><rect width="60" height="9" y="0"  fill="#fcf434"/><rect width="60" height="9" y="9"  fill="#ffffff"/><rect width="60" height="9" y="18" fill="#9c59d1"/><rect width="60" height="9" y="27" fill="#2c2c2c"/></svg>`,
  queer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" preserveAspectRatio="none"><rect width="60" height="6" y="0"  fill="#b57edc"/><rect width="60" height="6" y="6"  fill="#b57edc"/><rect width="60" height="6" y="12" fill="#ffffff"/><rect width="60" height="6" y="18" fill="#48821e"/><rect width="60" height="6" y="24" fill="#48821e"/><rect width="60" height="6" y="30" fill="#000000"/></svg>`,
  ace: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" preserveAspectRatio="none"><rect width="60" height="9" y="0"  fill="#000000"/><rect width="60" height="9" y="9"  fill="#a3a3a3"/><rect width="60" height="9" y="18" fill="#ffffff"/><rect width="60" height="9" y="27" fill="#800080"/></svg>`,
  pan: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" preserveAspectRatio="none"><rect width="60" height="12" y="0"  fill="#ff218c"/><rect width="60" height="12" y="12" fill="#ffd800"/><rect width="60" height="12" y="24" fill="#21b1ff"/></svg>`,
  intersex: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" preserveAspectRatio="none"><rect width="60" height="36" fill="#ffd800"/><circle cx="30" cy="18" r="9" fill="none" stroke="#7902aa" stroke-width="3"/></svg>`,
  progress: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" preserveAspectRatio="none"><rect width="60" height="6" y="0"  fill="#e40303"/><rect width="60" height="6" y="6"  fill="#ff8c00"/><rect width="60" height="6" y="12" fill="#ffed00"/><rect width="60" height="6" y="18" fill="#008026"/><rect width="60" height="6" y="24" fill="#004dff"/><rect width="60" height="6" y="30" fill="#750787"/><polygon points="0,0 24,18 0,36" fill="#000"/><polygon points="0,4 18,18 0,32" fill="#603814"/><polygon points="0,8 12,18 0,28" fill="#5bcefa"/><polygon points="0,12 6,18 0,24" fill="#f5a9b8"/><polygon points="0,15 2,18 0,21" fill="#ffffff"/></svg>`
};

export const IDENTITY_GLOSSARY: { slug: string; labelFr: string; labelEn: string; flag: FlagSlug; description: string }[] = [
  { slug: 'gay',     labelFr: 'Gay',         labelEn: 'Gay',          flag: 'gay',      description: 'Personne attirée romantiquement et/ou sexuellement par les personnes du même genre. Souvent utilisé pour les hommes gays.' },
  { slug: 'lesbian', labelFr: 'Lesbienne',   labelEn: 'Lesbian',      flag: 'lesbian',  description: 'Femme attirée romantiquement et/ou sexuellement par les femmes.' },
  { slug: 'bi',      labelFr: 'Bi·e',        labelEn: 'Bi',           flag: 'bi',       description: 'Personne attirée par plus d\'un genre. Pas obligatoirement deux, et pas obligatoirement à parts égales.' },
  { slug: 'pan',     labelFr: 'Pan',         labelEn: 'Pan',          flag: 'pan',      description: 'Personne attirée par les personnes peu importe leur genre. L\'attirance se base sur la personne, pas son identité de genre.' },
  { slug: 'trans',   labelFr: 'Trans',       labelEn: 'Trans',        flag: 'trans',    description: 'Personne dont l\'identité de genre ne correspond pas au genre assigné à la naissance.' },
  { slug: 'nb',      labelFr: 'Non-binaire', labelEn: 'Non-binary',   flag: 'nb',       description: 'Personne dont l\'identité de genre n\'est ni strictement homme ni strictement femme.' },
  { slug: 'queer',   labelFr: 'Queer',       labelEn: 'Queer',        flag: 'queer',    description: 'Terme parapluie pour toute identité non hétérocisnormative. Approprié par la communauté, à l\'origine insulte.' },
  { slug: 'ace',     labelFr: 'Asexuel·le',  labelEn: 'Asexual',      flag: 'ace',      description: 'Personne ne ressentant pas ou peu d\'attirance sexuelle. L\'asexualité est un spectre (gris-ace, demi-sexuel·le...).' },
  { slug: 'intersex',labelFr: 'Intersexe',   labelEn: 'Intersex',     flag: 'intersex', description: 'Personne née avec des caractéristiques sexuelles (chromosomes, hormones, anatomie) qui ne correspondent pas aux définitions binaires homme/femme.' }
];
