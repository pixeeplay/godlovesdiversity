import { prisma } from './prisma';

/**
 * Modération auto via Gemini.
 * Retourne approved | flagged (à examiner) | removed (bloqué).
 * En cas d'absence de clé Gemini, approve par défaut (ne bloque pas).
 */
export async function moderateText(text: string): Promise<{ status: 'approved' | 'flagged' | 'removed'; notes: string }> {
  const setting = await prisma.setting.findUnique({ where: { key: 'ai.geminiApiKey' } }).catch(() => null);
  const apiKey = setting?.value || process.env.GEMINI_API_KEY;
  if (!apiKey) return { status: 'approved', notes: '' };

  const prompt = `Tu es modérateur d'un réseau social inclusif LGBT religieux (foi + diversité). Le contenu peut parler de spiritualité, sexualité, identité, foi, traumatisme religieux. Tolère le langage cru sur ces sujets.

REJETTE seulement (status=removed) :
- Haine ciblée explicite (insultes contre groupes, déshumanisation)
- Doxxing (coordonnées privées d'autrui)
- Pédopornographie ou allusions sexuelles aux mineurs
- Menaces de mort/violence directes et crédibles
- Spam manifeste / arnaques

SIGNALE pour examen humain (status=flagged) :
- Témoignages très durs sur thérapies de conversion (laisser passer mais flagger)
- Contenu sexuel explicite (pas pour ce réseau familial)
- Propos qui semblent suicidaires (déclencher protocole d'aide)

APPROUVE le reste, y compris :
- Critique des institutions religieuses
- Témoignages personnels difficiles
- Vocabulaire LGBT cru ou militant
- Désaccords théologiques

Réponds UNIQUEMENT en JSON valide : {"status":"approved|flagged|removed","notes":"raison courte si flagged/removed"}

Texte à modérer :
"""${text.slice(0, 2000)}"""`;

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      })
    });
    const j = await r.json();
    const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(txt);
    if (['approved', 'flagged', 'removed'].includes(parsed.status)) {
      return { status: parsed.status, notes: parsed.notes || '' };
    }
  } catch {}
  return { status: 'approved', notes: '' };
}

/** Modération image via Gemini Vision (futur). Pour MVP on approuve par défaut. */
export async function moderateImage(_imageUrl: string): Promise<{ status: 'approved' | 'flagged' | 'removed'; notes: string }> {
  return { status: 'approved', notes: '' };
}
