/**
 * legal-rag — chat juridique français basé sur les skills paperasse.
 *
 * Surcharge de ask() avec :
 *   - System prompt « assistant juridique prudent » (jamais de conseil sans qualification,
 *     toujours rappeler la fraîcheur des chiffres, recommander un pro)
 *   - Retrieve filtré sur les chunks taggés "paperasse"
 *   - Citations obligatoires
 *
 * Pas de "bypass guardrails" ici : on est dans un contexte sensible (compta/fiscalité/notariat),
 * un mauvais conseil peut coûter cher au visiteur. L'assistant est volontairement conservateur.
 */

import { prisma } from './prisma';
import { embedText } from './rag';
import { callGeminiText, GEMINI_MODELS } from './gemini-text';

const TOP_K = 6;
const MIN_SCORE = 0.50;

export type LegalAskResult = {
  answer: string;
  sources: { title: string; source: string | null; score: number; skill?: string }[];
  topScore: number;
  /** Si aucune source pertinente, on flag pour que l'UI affiche un disclaimer renforcé. */
  noSourceMatch: boolean;
  modelUsed?: string;
  debugPrompt?: string;
};

const LEGAL_SYSTEM_PROMPT = `Tu es un assistant juridique et bureaucratique français basé sur le skillset open-source « paperasse » (MIT, romainsimon/paperasse).

Tu couvres 6 domaines : comptabilité (PCG, TVA, IS, FEC, liasse fiscale), facturation (mentions obligatoires, e-invoicing 2026), contrôle fiscal, audit CAC, fiscalité des particuliers (IR, IFI, PFU, PEA, LMNP, RSU, BSPCE, crypto, PER), droit notarial (immobilier, succession, donation, SCI, PACS), gestion de copropriété (AG, charges, travaux).

RÈGLES NON-NÉGOCIABLES :
1. **Cite TOUJOURS tes sources** sous forme [Source N] quand tu utilises les passages fournis.
2. **N'invente JAMAIS** un montant, un seuil, un taux, un article de loi ou un formulaire que tu ne vois pas explicitement dans les sources.
3. **Mentionne la fraîcheur** : la fiscalité française change vite. Si la source ne précise pas la date, dis « les chiffres peuvent avoir évolué, vérifiez les barèmes en vigueur ».
4. **Recommande un professionnel** pour toute décision impliquant un montant, un délai légal, ou une structuration patrimoniale (« pour valider votre situation, consultez un expert-comptable / notaire / avocat fiscaliste »).
5. **Pas de chiffres précis sans source** : si on te demande « combien coûte X », ne donne un chiffre QUE s'il vient d'une source fournie. Sinon réponds « cela dépend de [paramètres], le calcul exact dépend de votre situation, voici les facteurs à considérer ».
6. **Réponse structurée** : markdown avec titres, listes, gras pour les points clés. Pas de pavés.
7. **Si la question sort du périmètre paperasse** (médical, droit pénal, droit international, etc.), dis-le honnêtement : « ce n'est pas mon domaine, voici les ressources à consulter ».

CONTEXTE GLD : ce chat est intégré au site « God Loves Diversity ». Si la question concerne les droits LGBT+ (PACS, mariage, succession entre conjoints de même sexe, transition de genre administrative, héritage, etc.), réponds avec bienveillance et précision technique.`;

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

/**
 * Retrieve filtré sur les chunks de docs taggés "paperasse" + tag skill optionnel.
 */
export async function retrieveLegal(
  question: string,
  opts: { topK?: number; skill?: string } = {}
): Promise<{ chunks: any[]; topScore: number }> {
  const tagsFilter: any = { hasSome: ['paperasse'] };
  if (opts.skill) tagsFilter.hasEvery = ['paperasse', opts.skill];

  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      doc: {
        enabled: true,
        tags: tagsFilter,
      },
    },
    include: { doc: true },
    take: 2000,
  });

  if (chunks.length === 0) return { chunks: [], topScore: 0 };

  const queryVec = await embedText(question);

  const scored = chunks.map((c) => {
    const emb = c.embedding as unknown as number[];
    return {
      chunkId: c.id,
      docTitle: c.doc.title,
      source: c.doc.source,
      tags: c.doc.tags,
      text: c.text,
      score: cosine(queryVec, emb),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, opts.topK || TOP_K);
  return { chunks: top, topScore: top[0]?.score || 0 };
}

/**
 * Pose une question à l'assistant juridique. Toujours avec garde-fous renforcés.
 */
export async function askLegal(question: string, opts: { skill?: string; debug?: boolean } = {}): Promise<LegalAskResult> {
  const { chunks, topScore } = await retrieveLegal(question, { skill: opts.skill });
  const noSourceMatch = chunks.length === 0 || topScore < MIN_SCORE;

  let prompt: string;
  if (chunks.length > 0 && !noSourceMatch) {
    const sources = chunks
      .map((c, i) => {
        const skill = (c.tags as string[]).find((t) => ['comptable', 'notaire', 'fiscaliste', 'controleur-fiscal', 'commissaire-aux-comptes', 'syndic'].includes(t));
        return `[Source ${i + 1} : « ${c.docTitle } »${skill ? ` — domaine ${skill}` : ''}${c.source ? ` — ${c.source}` : ''}]\n${c.text}`;
      })
      .join('\n\n---\n\n');
    prompt = `${LEGAL_SYSTEM_PROMPT}

SOURCES À TA DISPOSITION (cite-les via [Source N]) :

${sources}

QUESTION DE L'UTILISATEUR :
${question}

Réponds maintenant en suivant TOUTES les règles ci-dessus.`;
  } else {
    prompt = `${LEGAL_SYSTEM_PROMPT}

ATTENTION : aucune source paperasse pertinente n'a été trouvée pour cette question (top score ${topScore.toFixed(2)} < ${MIN_SCORE}).
Tu peux répondre depuis ton savoir général SI la question est dans ton périmètre, MAIS :
- Préviens explicitement que ta réponse n'est pas basée sur une source vérifiée
- Renforce le rappel "consultez un professionnel"
- Donne-toi le droit de dire "je ne sais pas avec certitude"

QUESTION DE L'UTILISATEUR :
${question}`;
  }

  const { settings } = await import('./settings').then((m) => ({ settings: m.getSettings }));
  const sett = await settings(['integrations.gemini.apiKey']).catch(() => ({} as any));
  const key = sett['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Clé Gemini non configurée');

  const r = await callGeminiText({
    apiKey: key,
    prompt,
    model: GEMINI_MODELS.CHAT,
    temperature: 0.3,
    maxOutputTokens: 2000,
    timeoutMs: 45_000,
  });

  return {
    answer: r?.text || 'Je n\'ai pas pu formuler de réponse. Réessaie ?',
    sources: chunks.map((c) => {
      const skill = (c.tags as string[]).find((t) => ['comptable', 'notaire', 'fiscaliste', 'controleur-fiscal', 'commissaire-aux-comptes', 'syndic'].includes(t));
      return {
        title: c.docTitle,
        source: c.source,
        score: Number(c.score.toFixed(3)),
        skill,
      };
    }),
    topScore: Number(topScore.toFixed(3)),
    noSourceMatch,
    modelUsed: r?.modelUsed,
    ...(opts.debug ? { debugPrompt: prompt } : {}),
  };
}
