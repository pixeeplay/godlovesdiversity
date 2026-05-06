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
    videos: string[];
    coverImage: string;
    googlePlaceId: string;
    tags: string[];
    upcomingEventsHint: Array<{ title: string; date?: string; source?: string }>;
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

  const prompt = `Tu es un assistant de recherche pour un annuaire LGBT-friendly. Trouve sur le web les informations VÉRIFIABLES sur cet établissement et SOIS GÉNÉREUX dans la recherche de médias.

ÉTABLISSEMENT : ${locator}
TYPE : ${venue.type || 'inconnu'}
${venue.existing?.website ? `Site connu : ${venue.existing.website}` : ''}
${venue.existing?.facebook ? `Facebook connu : ${venue.existing.facebook}` : ''}

Cherche en profondeur :
1. **Site officiel + page Google Maps + Facebook + Instagram + Yelp + TripAdvisor**
2. Téléphone, email, adresse complète
3. **Horaires d'ouverture** (par jour de la semaine)
4. **Photos publiques RICHES** : 6-12 URLs d'images JPG/PNG/WebP. Cherche dans :
   - Site officiel (souvent /gallery, /photos, /accueil)
   - Page Google Maps (photos publiques)
   - Page Facebook (photos d'évènements, intérieur, ambiance)
   - Articles de presse / blogs locaux LGBT
   - Yelp / TripAdvisor
5. **Vidéos** : 1-3 URLs YouTube/Vimeo de l'établissement (visite, ambiance, événements)
6. **Événements à venir** détectables sur leur page FB/site (3 max)
7. Description courte (1 phrase) + description longue (4-6 phrases) en FRANÇAIS
8. Tags pertinents pour une audience LGBT

RÉPONDS UNIQUEMENT en JSON strict (pas de markdown) :
{
  "found": true|false,
  "phone": "+33...|null",
  "email": "...|null",
  "website": "https://...|null",
  "facebook": "https://www.facebook.com/...|null",
  "instagram": "https://www.instagram.com/...|null",
  "googlePlaceId": "ChIJ...|null",
  "shortDescription": "1 phrase punchy ≤ 100 chars|null",
  "description": "4-6 phrases en FR|null",
  "openingHours": {"mon":"10:00-22:00","tue":"...","wed":"...","thu":"...","fri":"...","sat":"...","sun":"closed"} | null,
  "photos": ["https://...","..."],
  "videos": ["https://www.youtube.com/watch?v=...","..."],
  "coverImage": "https://...|null",
  "upcomingEventsHint": [{"title":"...","date":"YYYY-MM-DD","source":"facebook|site"}],
  "tags": ["safe-space","drag-show","..."],
  "notes": "Mention si infos contradictoires"
}

RÈGLES STRICTES :
- Photos : URLs publiques absolues UNIQUEMENT (pas blob:, pas localhost). Privilégie .jpg/.png/.webp directs. Vise 6-12 photos.
- Videos : YouTube/Vimeo direct URL avec ID visible (pas de raccourci suspect)
- Si pas sûr → null ou tableau vide. JAMAIS d'invention d'URL.
- Description : ton inclusif, pas commercial racoleur, ≥ 100 chars
- Tags : 4-8 tags pertinents (drag-show, happy-hour, terrasse, safe-space, etc.)`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const callGemini = async (extraInstruction = '') => {
    const body = {
      contents: [{ parts: [{ text: prompt + extraInstruction }] }],
      tools: [{ google_search: {} }],
      // 4096 tokens (au lieu de 2048) pour éviter la troncation quand grounded search ajoute du contexte.
      // Temperature 0 pour déterminisme (toujours le même JSON pour le même venue).
      generationConfig: { temperature: 0, maxOutputTokens: 4096 }
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  };

  let raw: any;
  try {
    raw = await callGemini();
  } catch (e: any) {
    return { ok: false, confidence: 0, patch: {}, sources: [], notes: '', error: 'fetch-failed: ' + e.message };
  }

  if (raw?.error) {
    return { ok: false, confidence: 0, patch: {}, sources: [], notes: '', error: raw.error.message || 'gemini-error', raw };
  }

  const extractText = (r: any): { text: string; sources: { url: string; title: string }[]; finishReason: string } => {
    const cand = r?.candidates?.[0];
    const text: string = cand?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('\n') || '';
    const groundingMeta = cand?.groundingMetadata || {};
    const groundingChunks: any[] = groundingMeta.groundingChunks || [];
    const sources = groundingChunks
      .map((c) => c.web)
      .filter(Boolean)
      .map((w: any) => ({ url: w.uri || w.url, title: w.title || '' }));
    return { text, sources, finishReason: cand?.finishReason || '' };
  };

  let { text, sources, finishReason } = extractText(raw);

  // Helper : tente d'extraire un JSON complet depuis un texte brouillé
  const tryParseJson = (s: string): any | null => {
    // 1) Strip markdown code fences éventuels
    let cleaned = s.replace(/^[\s\S]*?```(?:json)?\s*/, '').replace(/\s*```[\s\S]*$/, '').trim();
    // 2) Si ne commence pas par {, cherche le premier {
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) cleaned = cleaned.slice(firstBrace);
    // 3) Trouve la dernière } "matchante" pour avoir un objet équilibré
    let depth = 0, lastValidEnd = -1, inString = false, escape = false;
    for (let i = 0; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"' && !escape) inString = !inString;
      if (inString) continue;
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) { lastValidEnd = i; break; }
      }
    }
    if (lastValidEnd > 0) cleaned = cleaned.slice(0, lastValidEnd + 1);

    try { return JSON.parse(cleaned); } catch {}

    // 4) Dernière chance : si le JSON a été tronqué (description coupée), essayer de fermer proprement
    // en remplaçant la dernière chaîne incomplète par null
    try {
      const repaired = cleaned.replace(/"([^"]*)"$/, 'null}').replace(/,\s*$/, '');
      return JSON.parse(repaired);
    } catch {}

    return null;
  };

  let parsed = tryParseJson(text);

  // Retry une fois si parse échoué OU si finish=MAX_TOKENS (réponse tronquée)
  if (!parsed || finishReason === 'MAX_TOKENS') {
    try {
      const retryRaw = await callGemini('\n\nIMPORTANT : RÉPONSE COURTE. Description max 200 chars. Photos : 3 max. Réponds SEULEMENT le JSON, RIEN d\'autre. Ferme bien toutes les accolades.');
      if (!retryRaw?.error) {
        const ret = extractText(retryRaw);
        const retryParsed = tryParseJson(ret.text);
        if (retryParsed) {
          parsed = retryParsed;
          sources = ret.sources.length ? ret.sources : sources;
          raw = retryRaw;
        }
      }
    } catch {}
  }

  if (!parsed) {
    return {
      ok: false,
      confidence: 0,
      patch: {},
      sources,
      notes: `Réponse Gemini non parsable (finishReason=${finishReason}). Aperçu : ${text.slice(0, 300)}…`,
      error: 'json-parse-failed',
      raw
    };
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
  if (Array.isArray(parsed.photos) && parsed.photos.length) patch.photos = parsed.photos.filter((u: any) => typeof u === 'string' && /^https?:\/\//.test(u) && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(u)).slice(0, 12);
  if (Array.isArray(parsed.videos) && parsed.videos.length) patch.videos = parsed.videos.filter((u: any) => typeof u === 'string' && /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(u)).slice(0, 5);
  if (parsed.coverImage && /^https?:\/\//.test(parsed.coverImage)) patch.coverImage = parsed.coverImage;
  if (Array.isArray(parsed.tags) && parsed.tags.length) patch.tags = parsed.tags.filter((t: any) => typeof t === 'string').slice(0, 15);
  if (Array.isArray(parsed.upcomingEventsHint) && parsed.upcomingEventsHint.length) {
    patch.upcomingEventsHint = parsed.upcomingEventsHint
      .filter((e: any) => e && typeof e.title === 'string')
      .slice(0, 5)
      .map((e: any) => ({ title: String(e.title).slice(0, 200), date: e.date, source: e.source }));
  }

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
