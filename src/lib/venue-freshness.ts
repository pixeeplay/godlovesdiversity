/**
 * Calcul du "freshness score" d'un venue : pourcentage de complétude de la fiche.
 * 0 = juste un nom, 100 = fiche super fine entièrement remplie.
 *
 * Pondération conçue pour récompenser les fiches RICHES :
 *  - identité de base (nom, ville, pays)        20pt
 *  - coordonnées GPS                            10pt
 *  - contact (phone OR email OR site)           10pt + 5 si plusieurs
 *  - description longue ≥ 100 chars             10pt
 *  - cover image                                10pt
 *  - galerie photos ≥ 3                          5pt + 5 si ≥ 8
 *  - vidéos ≥ 1                                  5pt
 *  - horaires d'ouverture                       10pt
 *  - réseaux sociaux (FB ou IG)                  5pt
 *  - tags ≥ 3                                    5pt
 *  - enrichi récemment (< 30j)                   5pt
 *  Total max = 100.
 */

export interface FreshnessBreakdown {
  score: number;
  parts: Array<{ label: string; got: number; max: number; ok: boolean }>;
  missing: string[];
}

export function computeFreshness(v: any): FreshnessBreakdown {
  const parts: FreshnessBreakdown['parts'] = [];
  const missing: string[] = [];
  let score = 0;
  const add = (label: string, got: number, max: number, missingLabel?: string) => {
    parts.push({ label, got, max, ok: got >= max });
    score += got;
    if (got < max && missingLabel) missing.push(missingLabel);
  };

  // Identité de base
  let identityGot = 0;
  if (v.name) identityGot += 8;
  if (v.city) identityGot += 6;
  if (v.country) identityGot += 4;
  if (v.address) identityGot += 2;
  add('Identité', identityGot, 20, identityGot < 20 ? 'adresse complète' : undefined);

  // Coords GPS
  add('Coordonnées GPS', (v.lat != null && v.lng != null) ? 10 : 0, 10, 'lat/lng (lance le géocodage)');

  // Contact
  let contactGot = 0;
  const contacts = [v.phone, v.email, v.website].filter(Boolean).length;
  if (contacts >= 1) contactGot += 10;
  if (contacts >= 2) contactGot += 5;
  add('Contact', contactGot, 15, contacts === 0 ? 'téléphone/email/site' : undefined);

  // Description
  add('Description', (v.description?.length || 0) >= 100 ? 10 : 0, 10, 'description longue');

  // Cover
  add('Image principale', v.coverImage ? 10 : 0, 10, 'cover image');

  // Galerie photos
  const photos = (v.photos || []).length;
  let galGot = 0;
  if (photos >= 3) galGot += 5;
  if (photos >= 8) galGot += 5;
  add('Galerie photos', galGot, 10, photos < 3 ? `${photos}/3 photos` : undefined);

  // Videos
  const videos = (v.videos || []).length;
  add('Vidéos', videos >= 1 ? 5 : 0, 5, videos === 0 ? 'vidéos YouTube' : undefined);

  // Horaires
  const hasHours = v.openingHours && Object.keys(v.openingHours).length > 0;
  add('Horaires', hasHours ? 10 : 0, 10, !hasHours ? 'horaires' : undefined);

  // Social
  const hasSocial = !!(v.facebook || v.instagram);
  add('Réseaux sociaux', hasSocial ? 5 : 0, 5, !hasSocial ? 'page FB/IG' : undefined);

  // Tags
  const tags = (v.tags || []).length;
  add('Tags', tags >= 3 ? 5 : 0, 5, tags < 3 ? `${tags}/3 tags` : undefined);

  // Frais
  const enrichedAt = v.enrichedAt ? new Date(v.enrichedAt) : null;
  const isFresh = enrichedAt && (Date.now() - enrichedAt.getTime() < 30 * 24 * 60 * 60 * 1000);
  add('Enrichi <30j', isFresh ? 5 : 0, 5, !isFresh ? 'enrichissement IA' : undefined);

  return { score: Math.round(score), parts, missing };
}
