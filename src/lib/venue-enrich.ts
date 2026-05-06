/**
 * Enrichissement IA des venues via Gemini Grounded Search.
 *
 * Strategy :
 *  1. Construit un prompt structuré avec le nom + adresse + ville du venue
 *  2. Appelle Gemini 2.5 Flash avec le tool `google_search` (gratuit, citations web)
 *  3. Demande un JSON strict en sortie : phone, email, website, hours, description, photos, social
 *  4. Calcule un score de confiance basé sur :
 *     - nombre de sources citées
 *     - présence de domaines officiels (site propre, FB, IG, GoogleMaps)
 *     - cohérence des données entre sources
 *
 * Coût estimé : ~$0.001 par venue (Gemini 2.5 Flash + grounding gratuit jusqu'à 1500 req/jour).
 *
 * Doc : https://ai.google.dev/gemini-api/docs/google-search
 */

import { getSettings } from './settings';

export interface EnrichResult {
  ok: boolean;
  confidence: number;          // 0..1
  patch: Partial<{             // champs à appliquer sur le venue
    phone: string;
    email: string;
    website: string;
    description: string;
    shortDescription: string;
    openingHours: Record<string, string>;
    facebook: string;
    instagram: string;
    photos: string[];
    coverImage: string;
    googlePlaceId: string;
    tags: string[];
  }>;
  sources: Array<{ url: string; title: string; fields?: string[] }>;
  notes: string;
  error?: string;
  raw?: any;
}

interface VenueInput {
  name: string;
  city?: string | null;
  address?: string | null;
  country?: string | null;
  type?: string;
  existing?: {
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    facebook?: string | null;
    instagram?: string | null;
  };
}

async function getGeminiKey(): Promise<{ key: string | undefined; model: string }> {
  const dbKeys = await getSettings([
    'integrations.gemini.apiKey',
    'integrations.gemini.textModel'
  ]).catch(() => ({} as Record<string, string>));
  return {
    key: dbKeys['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY,
    // 2.5 Flash : plus rapide et gratuit jusqu'à 1500 req/jour avec grounding
    model: dbKeys['integrations.gemini.textModel'] || process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash'
  };
}

export async function enrichVenue(venue: VenueInput): Promise<EnrichResult> {
  const { key, model } = await getGeminiKey();
  if (!key) {
    return { ok: false, confidence: 0, patch: {}, sources: [], notes: '', error: 'Gemini API key missing' };
  }

  const locator = [venue.name, venue.address, venue.city, venue.country].filter(Boolean).join(', ');

  const prompt = `Tu es un assistant de recherche pour un annuaire LGBT-friendly. Trouve sur le web les informations VÉRIFIABLES sur cet établissement :

ÉTABLISSEMENT : ${locator}
TYPE : ${venue.type || 'inconnu'}
${venue.existing?.website ? `Site connu : ${venue.existing.website}` : ''}
${venue.existing?.facebook ? `Facebook connu : ${venue.existing.facebook}` : ''}

Cherche sur Google :
1. Site officiel + page Google Maps + page Facebook + Instagram
2. Téléphone, email, adresse complète
3. Horaires d'ouverture (par jour de la semaine)
4. Photos publiques (URLs absolues d'images publiques uniquement)
5. Description courte (1 phrase) + description longue (3-5 phrases) en FRANÇAIS
6. Tags pertinents pour une audience LGBT (ex : "drag-show", "happy-hour", "safe-space", "wheelchair-accessible")

RÉPONDS UNIQUEMENT avec un JSON valide dans ce format strict (pas de markdown, pas de \`\`\`) :
{
  "found": true|false,
  "phone": "+33...|null",
  "email": "...|null",
  "website": "https://...|null",
  "facebook": "https://www.facebook.com/...|null",
  "instagram": "https://www.instagram.com/...|null",
  "googlePlaceId": "ChIJ...|null",
  "shortDescription": "1 phrase punchy en FR ≤ 100 chars|null",
  "description": "3-5 phrases en FR|null",
  "openingHours": {"mon":"10:00-22:00","tue":"...","wed":"...","thu":"...","fri":"...","sat":"...","sun":"closed"} | null,
  "photos": ["https://...", "..."]|null,
  "coverImage": "https://...|null",
  "tags": ["tag1","tag2"]|null,
  "notes": "Mention si infos contradictoires ou incomplètes"
}

Règles strictes :
- Si tu n'es PAS SÛR, mets null. Mieux vaut vide que faux.
- Pas d'invention d'URL. Si pas trouvé, null.
- Téléphone au format international (+33 X XX XX XX XX).
- Photos : URLs publiques absolues uniquement (pas de blob, pas de localhost).
- Description en FR, ton inclusif, pas de ton commercial racoleur.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
  };

  let raw: any;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    raw = await r.json();
  } catch (e: any) {
    return { ok: false, confidence: 0, patch: {}, sources: [], notes: '', error: 'fetch-failed: ' + e.message };
  }

  if (raw?.error) {
    return { ok: false, confidence: 0, patch: {}, sources: [], notes: '', error: raw.error.message || 'gemini-error', raw };
  }

  const cand = raw?.candidates?.[0];
  const text: string = cand?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('\n') || '';
  const groundingMeta = cand?.groundingMetadata || {};
  const groundingChunks: any[] = groundingMeta.groundingChunks || [];
  const sources = groundingChunks
    .map((c) => c.web)
    .filter(Boolean)
    .map((w: any) => ({ url: w.uri || w.url, title: w.title || '' }));

  let parsed: any = {};
  try {
    // Le JSON peut être entouré de markdown malgré la consigne
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, confidence: 0, patch: {}, sources, notes: text.slice(0, 500), error: 'json-parse-failed', raw };
  }

  if (parsed.found === false) {
    return { ok: false, confidence: 0, patch: {}, sources, notes: parsed.notes || 'Aucune donnée trouvée', raw };
  }

  // Construit le patch avec uniquement les champs non-null
  const patch: EnrichResult['patch'] = {};
  if (parsed.phone) patch.phone = String(parsed.phone).trim();
  if (parsed.email) patch.email = String(parsed.email).trim();
  if (parsed.website) patch.website = String(parsed.website).trim();
  if (parsed.facebook) patch.facebook = String(parsed.facebook).trim();
  if (parsed.instagram) patch.instagram = String(parsed.instagram).trim();
  if (parsed.googlePlaceId) patch.googlePlaceId = String(parsed.googlePlaceId).trim();
  if (parsed.shortDescription) patch.shortDescription = String(parsed.shortDescription).slice(0, 200);
  if (parsed.description) patch.description = String(parsed.description).slice(0, 2000);
  if (parsed.openingHours && typeof parsed.openingHours === 'object') patch.openingHours = parsed.openingHours;
  if (Array.isArray(parsed.photos) && parsed.photos.length) patch.photos = parsed.photos.filter((u: any) => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 12);
  if (parsed.coverImage && /^https?:\/\//.test(parsed.coverImage)) patch.coverImage = parsed.coverImage;
  if (Array.isArray(parsed.tags) && parsed.tags.length) patch.tags = parsed.tags.filter((t: any) => typeof t === 'string').slice(0, 15);

  // Score de confiance heuristique
  const confidence = computeConfidence(patch, sources);

  return {
    ok: true,
    confidence,
    patch,
    sources,
    notes: parsed.notes || `${Object.keys(patch).length} champs enrichis depuis ${sources.length} source(s)`,
    raw
  };
}

function computeConfidence(patch: EnrichResult['patch'], sources: EnrichResult['sources']): number {
  let score = 0.3; // base

  // Sources : +0.1 par source jusqu'à 4 sources
  score += Math.min(sources.length * 0.1, 0.4);

  // Domaines officiels reconnus = bonus
  const officialPatterns = [/google\.com\/maps/, /facebook\.com/, /instagram\.com/, /yelp\./, /tripadvisor\./];
  const hasOfficial = sources.some((s) => officialPatterns.some((p) => p.test(s.url)));
  if (hasOfficial) score += 0.15;

  // Si on a un Google Place ID = très fiable
  if (patch.googlePlaceId) score += 0.1;

  // Plus de champs récupérés = meilleur signal global
  const fieldsCount = Object.keys(patch).length;
  if (fieldsCount >= 6) score += 0.05;

  return Math.min(Math.round(score * 100) / 100, 0.95);
}
