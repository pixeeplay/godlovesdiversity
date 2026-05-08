/**
 * RAG « Demandez à GLD »
 *
 * Pipeline :
 *   ingest(doc)  →  chunk(text)  →  embed(chunk)  →  store
 *   ask(question) → embed(q) → cosineSearch(top K) → buildPrompt → Gemini → answer + sources
 *
 * Embedding : Gemini text-embedding-004 (768 dim, gratuit jusqu'à 1500 req/jour)
 * Stockage : tableaux JSON dans Prisma — recherche cosinus en JS
 *            (suffisant jusqu'à ~10k chunks ; pgvector si on dépasse)
 */
import { prisma } from './prisma';
import { getSettings } from './settings';

// Modèles embedding Gemini par ordre de préférence (plus récent → plus ancien)
// Le code essaie chacun jusqu'à ce qu'un fonctionne. Pas tous les comptes/régions
// ont accès au même modèle, donc fallback en chaîne.
const EMBED_MODELS = [
  'gemini-embedding-001',  // ✓ recommandé 2025+
  'text-embedding-004',    // ✓ générale dispo
  'embedding-001'          // legacy fallback
];
const CHUNK_SIZE_WORDS = 220;
const CHUNK_OVERLAP_WORDS = 40;
const TOP_K = 5;
const MIN_SCORE = 0.55; // Sous ce seuil → sujet probablement hors-thème

// Cache du modèle qui a fonctionné (évite de re-tester à chaque appel)
let workingEmbedModel: string | null = null;

/* ─── EMBEDDING ───────────────────────────────────────────────── */

async function getGeminiKey(): Promise<string> {
  const s = await getSettings(['integrations.gemini.apiKey']);
  const k = s['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY;
  if (!k) throw new Error('Clé Gemini non configurée');
  return k;
}

async function tryEmbed(model: string, key: string, text: string, version: 'v1' | 'v1beta' = 'v1beta'): Promise<{ values: number[] } | { error: string } | null> {
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/${version}/models/${model}:embedContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] }
        })
      }
    );
    if (!r.ok) {
      const errText = await r.text();
      return { error: `${version}/${model} HTTP ${r.status}: ${errText.slice(0, 100)}` };
    }
    const j = await r.json();
    const v = j?.embedding?.values;
    if (Array.isArray(v) && v.length > 100) return { values: v };
    return { error: `${version}/${model}: réponse vide` };
  } catch (e: any) {
    return { error: `${version}/${model}: ${e?.message || 'fetch failed'}` };
  }
}

/** Liste les modèles disponibles pour cette clé API (diagnostic). */
export async function listGeminiModels(): Promise<string[]> {
  const key = await getGeminiKey();
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (!r.ok) return [];
    const j = await r.json();
    return (j?.models || []).map((m: any) => m.name);
  } catch {
    return [];
  }
}

export async function embedText(text: string): Promise<number[]> {
  const key = await getGeminiKey();

  // Essai du modèle en cache si on en a un qui marche
  if (workingEmbedModel) {
    const r = await tryEmbed(workingEmbedModel.split('|')[1], key, text, workingEmbedModel.split('|')[0] as any);
    if (r && 'values' in r) return r.values;
    workingEmbedModel = null;
  }

  // Cascade : v1 puis v1beta, chaque modèle de la liste
  const errors: string[] = [];
  for (const version of ['v1', 'v1beta'] as const) {
    for (const model of EMBED_MODELS) {
      const r = await tryEmbed(model, key, text, version);
      if (r && 'values' in r) {
        workingEmbedModel = `${version}|${model}`;
        return r.values;
      }
      if (r && 'error' in r) errors.push(r.error);
    }
  }

  // Tous échoué : on liste les modèles dispos pour aider au diagnostic
  const available = await listGeminiModels();
  const embedModels = available.filter((m) => m.includes('embed'));
  const hint = embedModels.length > 0
    ? ` Modèles d'embedding disponibles pour ta clé : ${embedModels.join(', ')}`
    : ` Aucun modèle d'embedding accessible. Active l'API "Generative Language" dans Google Cloud Console pour ton projet.`;
  throw new Error(`Embedding Gemini impossible.${hint} Détails essayés : ${errors.slice(0, 3).join(' | ')}`);
}

/* ─── CHUNKING ────────────────────────────────────────────────── */

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const words = cleaned.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const slice = words.slice(i, i + CHUNK_SIZE_WORDS).join(' ');
    chunks.push(slice);
    i += CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS;
    if (i <= 0) break; // safeguard
  }
  return chunks.filter((c) => c.length > 30);
}

/* ─── INGESTION ───────────────────────────────────────────────── */

export type IngestInput = {
  title: string;
  content: string;
  source?: string;
  sourceType?: 'text' | 'pdf' | 'url' | 'photo';
  author?: string;
  tags?: string[];
  locale?: string;
};

export async function ingestDocument(input: IngestInput) {
  const doc = await prisma.knowledgeDoc.create({
    data: {
      title: input.title,
      content: input.content,
      source: input.source || null,
      sourceType: input.sourceType || 'text',
      author: input.author || null,
      tags: input.tags || [],
      locale: input.locale || 'fr'
    }
  });

  const pieces = chunkText(input.content);
  const created: any[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const text = pieces[i];
    try {
      const embedding = await embedText(text);
      const chunk = await prisma.knowledgeChunk.create({
        data: {
          docId: doc.id,
          position: i,
          text,
          embedding: embedding as any,
          tokens: Math.round(text.length / 4)
        }
      });
      created.push(chunk);
    } catch (e) {
      // Skip chunk en erreur mais continue
      console.error('Embed chunk failed', i, e);
    }
  }

  return { doc, chunkCount: created.length };
}

export async function reindexDocument(docId: string) {
  await prisma.knowledgeChunk.deleteMany({ where: { docId } });
  const doc = await prisma.knowledgeDoc.findUnique({ where: { id: docId } });
  if (!doc) throw new Error('Document introuvable');
  return ingestDocument({
    title: doc.title,
    content: doc.content,
    source: doc.source || undefined,
    sourceType: doc.sourceType as any,
    author: doc.author || undefined,
    tags: doc.tags,
    locale: doc.locale
  }).then(async (r) => {
    // L'ingestion crée un nouveau doc — on garde l'ancien et migre les chunks
    // Plus simple : on supprime l'ancien doc final et on garde le nouveau
    await prisma.knowledgeDoc.delete({ where: { id: docId } });
    return r;
  });
}

/* ─── RETRIEVAL ───────────────────────────────────────────────── */

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

export type RetrievedChunk = {
  chunkId: string;
  docId: string;
  docTitle: string;
  source: string | null;
  text: string;
  score: number;
};

export async function retrieve(
  query: string,
  opts: { locale?: string; topK?: number } = {}
): Promise<RetrievedChunk[]> {
  // 1. Vérifie d'abord s'il y a des chunks en DB. Si vide, inutile d'embedder.
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { doc: { enabled: true, locale: opts.locale || 'fr' } },
    include: { doc: true }
  });
  if (chunks.length === 0) return []; // Base vide → fallback Gemini direct côté ask()

  // 2. Embed la question (peut throw si Gemini API casse)
  const queryVec = await embedText(query);

  const scored = chunks.map((c) => {
    const emb = c.embedding as unknown as number[];
    return {
      chunkId: c.id,
      docId: c.docId,
      docTitle: c.doc.title,
      source: c.doc.source,
      text: c.text,
      score: cosine(queryVec, emb)
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, opts.topK || TOP_K);
}

/* ─── PROMPT BUILDER ──────────────────────────────────────────── */

const DEFAULT_SYSTEM_PROMPT = `Tu es la voix officielle du mouvement « God Loves Diversity » (GLD).

PRINCIPES NON-NÉGOCIABLES :
- Chaleur, douceur, accueil radical — jamais de jugement, jamais de morale
- Reconnaissance explicite des personnes LGBTQ+ comme aimées et bénies
- Précision théologique sur les 3 monothéismes (christianisme, islam, judaïsme)
- Tutoiement par défaut, langage simple et accessible, zéro jargon
- Citations sourcées (verset/sourate/page) quand tu utilises les textes fournis

STYLE :
- Réponses courtes (3 à 6 phrases maximum)
- Termine systématiquement par une question d'ouverture pour prolonger l'échange
- Utilise « tu », « toi » — pas de vouvoiement
- Évite les listes à puces, écris en prose chaleureuse

GARDE-FOUS :
- Si la question concerne un sujet hors foi/inclusion/diversité/spiritualité (ex: météo, sport, technique pure), réponds : « Je suis là pour parler de foi, d'amour et d'inclusion. Pour [sujet], je te conseille de chercher ailleurs. Veux-tu plutôt qu'on parle de [propose un thème GLD pertinent] ? »
- Si tu ne trouves pas la réponse dans les sources fournies, dis-le honnêtement : « Je n'ai pas encore cette réponse précise dans ma bibliothèque. Tu peux poser ta question à un humain via [contact]. »
- Ne jamais inventer une citation ou un verset.`;

export async function getSystemPrompt(): Promise<string> {
  const s = await getSettings(['rag.systemPrompt']);
  return s['rag.systemPrompt'] || DEFAULT_SYSTEM_PROMPT;
}

export async function buildRagPrompt(question: string, chunks: RetrievedChunk[]): Promise<string> {
  const sysPrompt = await getSystemPrompt();
  const sources = chunks
    .map((c, i) => `[Source ${i + 1} : « ${c.docTitle} »${c.source ? ` — ${c.source}` : ''}]\n${c.text}`)
    .join('\n\n---\n\n');

  return `${sysPrompt}

SOURCES À TA DISPOSITION (utilise-les en priorité, cite-les en mentionnant [Source N]) :

${sources}

QUESTION DU VISITEUR :
${question}

Réponds maintenant dans le style GLD défini plus haut.`;
}

/* ─── ASK (orchestration) ─────────────────────────────────────── */

export type AskResult = {
  answer: string;
  sources: { title: string; source: string | null; score: number; chunkId?: string; text?: string }[];
  topScore: number;
  offTopic: boolean;
  /** Mode test : prompt complet envoyé à Gemini (utile pour debug) */
  debugPrompt?: string;
  /** Mode test : confirme si le garde-fou a été bypassé */
  guardrailsBypass?: boolean;
};

export type AskOptions = {
  locale?: string;
  /** Si true : désactive le garde-fou hors-sujet et utilise un system prompt minimal sans verrou
   *  thématique foi/inclusion. Réservé aux outils admin (playground RAG). */
  bypassGuardrails?: boolean;
  /** Si true : inclut le prompt complet et le texte des chunks dans la réponse (debug). */
  debug?: boolean;
};

const NO_GUARDRAILS_PROMPT = `Tu es un assistant en mode TEST/ADMIN.

Mode test activé : aucun garde-fou thématique. Tu peux répondre à n'importe quelle question, en t'appuyant sur les sources fournies si pertinentes, sinon depuis ton savoir général.

STYLE :
- Réponse claire et structurée
- Cite les sources sous forme [Source N] quand tu utilises les passages fournis
- Ne fabrique JAMAIS de citation ni de verset que tu ne vois pas dans les sources

Note : ce mode est réservé au playground admin pour tester le RAG sans le verrou foi/inclusion par défaut.`;

export async function ask(question: string, opts: AskOptions = {}): Promise<AskResult> {
  // Tente le RAG. Si embedding plante OU si la base est vide → on passe en mode
  // "Gemini direct" avec juste le system prompt, sans sources.
  let chunks: RetrievedChunk[] = [];
  let ragWorked = false;
  try {
    chunks = await retrieve(question, opts);
    ragWorked = true;
  } catch (e: any) {
    console.warn('[RAG] retrieve failed, fallback to direct Gemini:', e?.message);
  }

  const topScore = chunks[0]?.score || 0;
  // Hors-sujet uniquement si on a des sources ET qu'aucune ne matche assez
  // bypassGuardrails désactive complètement la détection hors-sujet
  const offTopic = !opts.bypassGuardrails && ragWorked && chunks.length > 0 && topScore < MIN_SCORE;

  if (offTopic) {
    await prisma.unansweredQuery.create({
      data: { question, locale: opts.locale || 'fr', topScore }
    }).catch(() => {});
  }

  // Construit le prompt : avec sources si dispo, sans sinon
  // bypassGuardrails → utilise un system prompt minimal sans verrou thématique
  const sysPrompt = opts.bypassGuardrails ? NO_GUARDRAILS_PROMPT : await getSystemPrompt();
  let prompt: string;
  if (chunks.length > 0) {
    if (opts.bypassGuardrails) {
      const sources = chunks
        .map((c, i) => `[Source ${i + 1} : « ${c.docTitle} »${c.source ? ` — ${c.source}` : ''}]\n${c.text}`)
        .join('\n\n---\n\n');
      prompt = `${sysPrompt}\n\nSOURCES DISPONIBLES :\n\n${sources}\n\nQUESTION :\n${question}\n\nRéponds maintenant.`;
    } else {
      prompt = await buildRagPrompt(question, chunks);
    }
  } else {
    prompt = `${sysPrompt}\n\nQUESTION :\n${question}\n\n${
      opts.bypassGuardrails
        ? 'Réponds depuis ton savoir général (mode test admin, pas de bibliothèque RAG matchée).'
        : 'Réponds dans le style GLD défini plus haut. (Note : la bibliothèque de connaissances RAG n\'est pas encore alimentée, réponds depuis ton savoir général en restant fidèle au ton et aux principes GLD.)'
    }`;
  }

  const key = await getGeminiKey();
  // Modèle le plus récent avec fallback auto (gemini-3-flash → gemini-2.5-flash)
  const { callGeminiText, GEMINI_MODELS } = await import('./gemini-text');
  const r = await callGeminiText({
    apiKey: key,
    prompt,
    model: GEMINI_MODELS.CHAT,
    temperature: 0.4,
    maxOutputTokens: 600,
    timeoutMs: 30_000,
  });
  const answer = r?.text || 'Je n\'ai pas pu formuler de réponse. Réessaie ?';

  return {
    answer: answer.trim(),
    sources: chunks.map((c) => ({
      title: c.docTitle,
      source: c.source,
      score: Number(c.score.toFixed(3)),
      ...(opts.debug ? { chunkId: c.chunkId, text: c.text } : {}),
    })),
    topScore: Number(topScore.toFixed(3)),
    offTopic,
    ...(opts.debug ? { debugPrompt: prompt, guardrailsBypass: !!opts.bypassGuardrails } : {}),
  };
}
