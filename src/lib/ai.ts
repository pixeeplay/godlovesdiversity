/**
 * Helpers Gemini centralisés.
 * - Texte : generateContent
 * - Vision : generateContent avec inlineData image
 *
 * Lit la clé d'abord depuis la table Setting (BO),
 * puis fallback sur process.env.GEMINI_API_KEY.
 */
import { getSettings } from './settings';

async function getKey() {
  const s = await getSettings(['integrations.gemini.apiKey', 'integrations.gemini.textModel']).catch(() => ({} as Record<string, string>));
  return {
    key: s['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY || '',
    model: s['integrations.gemini.textModel'] || process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash'
  };
}

const SYSTEM_BRAND = `
Tu es l'assistant éditorial des plateformes parislgbt.com et francelgbt.com — communautaires LGBTQIA+.
Ligne éditoriale :
- Ton fun, joyeux, sex-positif sans être cru, militant sans être agressif
- Inclusif·ve : écriture inclusive raisonnée (point médian autorisé), respect strict des pronoms et identités
- Glossaire LGBTQIA+ maîtrisé : gay, lesbienne, bi, trans, non-binaire, queer, ace, pan, intersex, pride, drag, ballroom, vogue, PrEP, transition...
- Sécurisant : tu ne diffuses jamais d'info qui pourrait outer ou mettre en danger une personne
- Tu n'attribues aucun propos à de vraies personnes sauf source vérifiable
- Tu ne révèles jamais de données personnelles
- Aucune mention religieuse — tu parles de communauté, de droits, de visibilité, de fierté
- Public cible : 16+, communauté queer francophone, allié·es bienvenu·es
- Réponses concises et utiles : pas de longs monologues, vas droit au but avec chaleur
`.trim();

type GenInput = { prompt: string; system?: string; images?: { mimeType: string; data: string }[]; json?: boolean; temperature?: number };

export async function gemini({ prompt, system, images, json, temperature = 0.7 }: GenInput) {
  const { key, model } = await getKey();
  if (!key) {
    return {
      text: `🔑 Clé Gemini absente. Va dans /admin/settings pour la configurer.\n\nPrompt :\n${prompt}`,
      mock: true
    };
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const parts: any[] = [{ text: prompt }];
  if (images?.length) for (const img of images) parts.push({ inlineData: img });

  const body: any = {
    contents: [{ parts }],
    systemInstruction: { parts: [{ text: system || SYSTEM_BRAND }] },
    generationConfig: { temperature, responseMimeType: json ? 'application/json' : 'text/plain' }
  };

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, raw: j, mock: false };
}

/** Conversion d'une URL d'image en base64 + mime, prête pour Gemini Vision */
export async function imageToInline(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Cannot fetch ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const mime = r.headers.get('content-type') || 'image/jpeg';
  return { mimeType: mime, data: buf.toString('base64') };
}

/* ─── Helpers prêts à l'emploi ─────────────────────────────────── */

export async function aiCaptionImage(imageUrl: string, words = 80) {
  const img = await imageToInline(imageUrl);
  return gemini({
    prompt: `Décris cette photo en environ ${words} mots, ton fun et inclusif·ve, en français. Si tu vois un lieu LGBT (bar, club, drapeau pride, marche), identifie-le. Termine par 3 hashtags pertinents dont #parislgbt ou #francelgbt. Pas d'emoji.`,
    images: [img]
  });
}

export async function aiPolishTestimony(rawText: string, anonymize = true) {
  return gemini({
    prompt: `Réécris ce témoignage brut pour publication sur le site God Loves Diversity.
${anonymize ? '- Anonymise (supprime noms, lieux précis, numéros).' : ''}
- Ton lumineux et chaleureux, jamais victimaire ni polémique.
- 100 mots maximum.
- Garde la voix et l'intention de l'auteur.

Témoignage brut :
"""${rawText}"""

Renvoie uniquement le témoignage retravaillé, sans préambule.`
  });
}

export async function aiPostVariants(brief: string, network: string, count = 5) {
  return gemini({
    prompt: `Écris ${count} variantes très différentes d'un post pour ${network}.
Brief : ${brief}
Contraintes par réseau :
- Instagram : 80 mots max + 3 hashtags
- X / Twitter : 280 caractères max
- LinkedIn : 150 mots, ton professionnel + 2 hashtags
- Facebook : 100 mots + 1 émoji
- TikTok : accroche en 2 lignes max + 3 hashtags

Renvoie un JSON valide : { "variants": [ { "version": 1, "content": "..." }, ... ] }`,
    json: true
  });
}

export async function aiNewsletterMonth(stats: any) {
  return gemini({
    prompt: `Rédige une newsletter mensuelle pour le mouvement God Loves Diversity, en HTML simple (pas de <html>/<body>).
Statistiques du mois :
${JSON.stringify(stats, null, 2)}

Structure :
1. Titre h1 chaleureux
2. Mot d'accueil (50 mots)
3. Section "Les chiffres du mois" (chiffres mis en valeur)
4. Section "Témoignages choisis" (mentionne 2 témoignages)
5. Section "À venir" (3 actions)
6. CTA bouton

Maximum 250 mots au total.`
  });
}

export async function aiTranslate(text: string, target: 'en' | 'es' | 'pt', context?: string) {
  return gemini({
    prompt: `Traduis ce texte en ${target.toUpperCase()}.
${context ? `Contexte : ${context}` : ''}
Garde le ton (lumineux, inclusif, apaisé). Conserve le formatage (sauts de ligne, **gras**, listes).

Texte :
"""${text}"""

Renvoie uniquement la traduction, sans préambule.`,
    temperature: 0.3
  });
}

export async function aiDetectLanguage(text: string) {
  return gemini({
    prompt: `Détecte la langue de ce texte. Renvoie uniquement le code ISO 639-1 sur 2 lettres (ex: "fr", "en", "ar").

Texte : """${text.slice(0, 500)}"""`,
    temperature: 0
  });
}

export async function aiCulturalAdaptation(text: string, market: string) {
  return gemini({
    prompt: `Adapte cette accroche pour le public ${market}. Garde le sens, ajuste les références culturelles, le registre et les formules. Renvoie uniquement l'accroche adaptée.

Texte original : """${text}"""`
  });
}

export async function aiVerseOfTheDay(theme?: string) {
  return gemini({
    prompt: `Rédige un message inspirant quotidien pour les abonnés de God Loves Diversity.
${theme ? `Thème : ${theme}` : ''}
- 1 ou 2 phrases courtes, lumineuses, inclusives
- Ton communautaire, sex-positif et chaleureux
- Aucune mention religieuse — tu parles de communauté queer, de fierté, de droits

Renvoie uniquement le message, sans préambule.`,
    temperature: 0.9
  });
}

export async function aiSentiment(text: string) {
  return gemini({
    prompt: `Analyse le sentiment de ce témoignage. Renvoie un JSON valide :
{
  "primary": "joie|espoir|tristesse|colère|peur|gratitude|résilience",
  "secondary": ["..."],
  "intensity": 1-10,
  "summary": "une phrase de synthèse"
}

Témoignage : """${text}"""`,
    json: true,
    temperature: 0.2
  });
}

export async function aiClusterTestimonies(items: { id: string; text: string }[]) {
  return gemini({
    prompt: `Regroupe ces témoignages en 3-6 clusters thématiques.
Renvoie un JSON valide :
{
  "clusters": [
    { "theme": "Rejet familial", "ids": ["id1", "id2"], "summary": "..." },
    ...
  ]
}

Témoignages :
${items.map((it) => `[${it.id}] ${it.text.slice(0, 200)}`).join('\n')}`,
    json: true,
    temperature: 0.3
  });
}

export async function aiWeeklyDigest(stats: any) {
  return gemini({
    prompt: `Rédige une synthèse hebdomadaire pour l'admin du mouvement God Loves Diversity.
Stats brutes : ${JSON.stringify(stats)}
Format Markdown, 6-8 puces, ton de coach (énergique, factuel). Termine par 1 reco d'action prioritaire.`
  });
}

export async function aiEditorialCalendar(monthDate: string, location = 'monde') {
  return gemini({
    prompt: `Pour le mois ${monthDate} (${location}), liste les événements religieux et inclusifs majeurs et propose pour chacun un post à publier.
Inclus : fêtes religieuses (toutes traditions), journées internationales LGBT+, anniversaires marquants, marches.
Renvoie un JSON valide :
{ "events": [ { "date": "YYYY-MM-DD", "name": "...", "category": "religieux|lgbt|culturel", "post_idea": "..." } ] }`,
    json: true
  });
}

export async function aiNlSearch(query: string, photos: any[]) {
  return gemini({
    prompt: `L'utilisateur cherche : "${query}"
Voici les photos disponibles (id, lieu, type, ville, pays) :
${JSON.stringify(photos.slice(0, 200))}

Renvoie un JSON valide : { "matchedIds": ["id1", "id2", ...] } — uniquement les photos qui correspondent vraiment.`,
    json: true,
    temperature: 0.2
  });
}

export async function aiInclusiveChat(question: string, history: { role: 'user' | 'model'; text: string }[] = []) {
  const { key, model } = await getKey();
  if (!key) return { text: '🔑 Pour activer le chat, configure ta clé Gemini dans le back-office.', mock: true };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const contents = [
    ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: question }] }
  ];
  const system = `Tu es l'assistant·e queer de parislgbt.com / francelgbt.com.
Tu réponds aux questions sur les lieux, les soirées, les identités, la santé sexuelle et mentale, les droits, et la vie LGBTQIA+ en France.
Règles strictes :
- Toujours apaisé, jamais polémique, jamais militant
- Cite les sources théologiques inclusives (théologiens, communautés inclusives) plutôt que de juger
- Reconnais que d'autres lectures existent
- N'attaque aucun groupe, aucune identité, aucune personne. Tolérance zéro pour la haine.
- Renvoie vers /argumentaire ou /a-propos quand pertinent
- Si la question dépasse la foi (santé mentale, etc.), oriente vers une aide professionnelle.
Réponds en 150 mots max, ton chaleureux.`;
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { temperature: 0.6 }
    })
  });
  const j = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, raw: j, mock: false };
}
