/**
 * gemini-text — wrapper minimal pour les appels Gemini text-only utilisés par le RAG.
 *
 * Centralise le choix du modèle pour pouvoir l'upgrader à un seul endroit. Stratégie :
 * tente d'abord le modèle "preferred" (le plus récent), fallback automatique sur
 * une cascade en cas de 404 (modèle indispo pour la clé/région).
 *
 * Modèles utilisés (mai 2026) :
 *   - gemini-3-flash-lite  → cleaner markdown, summarize, tags (rapide & pas cher)
 *   - gemini-3-flash       → réponse RAG finale (qualité supérieure)
 *
 * Fallbacks automatiques :
 *   gemini-3-flash-lite → gemini-2.5-flash-lite → gemini-2.0-flash-lite
 *   gemini-3-flash      → gemini-2.5-flash      → gemini-2.0-flash
 */

const FALLBACK_CHAINS: Record<string, string[]> = {
  'gemini-3-flash-lite': ['gemini-3-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-lite'],
  'gemini-3-flash':      ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  'gemini-3-pro':        ['gemini-3-pro', 'gemini-2.5-pro'],
};

/** Modèles préférés pour différents usages dans le RAG. */
export const GEMINI_MODELS = {
  /** Cleaner / extracteur sémantique / tags / summarize (volume, pas cher). */
  CLEANER: 'gemini-3-flash-lite',
  /** Réponse finale du chat RAG (qualité). */
  CHAT: 'gemini-3-flash',
} as const;

// Cache du modèle qui marche par chaîne (évite de re-tester le 1er à chaque appel)
const workingModel = new Map<string, string>();

export type GeminiCallOptions = {
  apiKey: string;
  /** Texte du prompt complet à envoyer. */
  prompt: string;
  /** Modèle préféré (la cascade démarre depuis lui). */
  model?: string;
  /** Température. Défaut 0.4. */
  temperature?: number;
  /** Max output tokens. Défaut 800. */
  maxOutputTokens?: number;
  /** Si true, force responseMimeType=application/json (structured output). */
  jsonMode?: boolean;
  /** Schéma JSON pour responseSchema (impose jsonMode=true automatiquement). */
  jsonSchema?: any;
  /** Timeout ms. Défaut 25_000. */
  timeoutMs?: number;
};

export type GeminiCallResult = {
  text: string;
  modelUsed: string;
  tokensIn?: number;
  tokensOut?: number;
};

/**
 * Appelle Gemini avec fallback automatique sur les modèles plus anciens si le récent n'existe pas.
 * Retourne null en cas d'échec total.
 */
export async function callGeminiText(opts: GeminiCallOptions): Promise<GeminiCallResult | null> {
  const requested = opts.model || GEMINI_MODELS.CHAT;
  const chain = FALLBACK_CHAINS[requested] || [requested];
  const cacheKey = chain.join('>');

  // Reorder : essayer en premier le modèle déjà connu pour marcher
  const cached = workingModel.get(cacheKey);
  const orderedChain = cached
    ? [cached, ...chain.filter((m) => m !== cached)]
    : chain;

  for (const model of orderedChain) {
    try {
      const body: any = {
        contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.4,
          maxOutputTokens: opts.maxOutputTokens ?? 800,
        },
      };
      if (opts.jsonSchema) {
        body.generationConfig.responseMimeType = 'application/json';
        body.generationConfig.responseSchema = opts.jsonSchema;
      } else if (opts.jsonMode) {
        body.generationConfig.responseMimeType = 'application/json';
      }

      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${opts.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
        }
      );

      if (r.status === 404 || r.status === 400) {
        // Modèle indispo (404) ou body invalide pour ce modèle (400) → essaye le suivant
        continue;
      }
      if (!r.ok) return null;

      const j = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== 'string' || text.length === 0) continue;

      workingModel.set(cacheKey, model);
      return {
        text,
        modelUsed: model,
        tokensIn: j?.usageMetadata?.promptTokenCount,
        tokensOut: j?.usageMetadata?.candidatesTokenCount,
      };
    } catch {
      // timeout / network → essaye le suivant
      continue;
    }
  }

  return null;
}
