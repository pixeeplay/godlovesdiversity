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

const EMBED_MODEL = 'text-embedding-004';
const EMBED_DIM = 768;
const CHUNK_SIZE_WORDS = 220;
const CHUNK_OVERLAP_WORDS = 40;
const TOP_K = 5;
const MIN_SCORE = 0.55; // Sous ce seuil → sujet probablement hors-thème

/* ─── EMBEDDING ───────────────────────────────────────────────── */

async function getGeminiKey(): Promise<string> {
  const s = await getSettings(['integrations.gemini.apiKey']);
  const k = s['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY;
  if (!k) throw new Error('Clé Gemini non configurée');
  return k;
}

export async function embedText(text: string): Promise<number[]> {
  const key = await getGeminiKey();
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] }
      })
    }
  );
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Embedding HTTP ${r.status}: ${err.slice(0, 200)}`);
  }
  const j = await r.json();
  const v = j?.embedding?.values;
  if (!Array.isArray(v) || v.length !== EMBED_DIM) {
    throw new Error('Réponse embedding invalide');
  }
  return v;
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
  const queryVec = await embedText(query);
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { doc: { enabled: true, locale: opts.locale || 'fr' } },
    include: { doc: true }
  });

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
  sources: { title: string; source: string | null; score: number }[];
  topScore: number;
  offTopic: boolean;
};

export async function ask(question: string, opts: { locale?: string } = {}): Promise<AskResult> {
  const chunks = await retrieve(question, opts);
  const topScore = chunks[0]?.score || 0;
  const offTopic = topScore < MIN_SCORE;

  // Si hors-sujet : log dans la file et renvoie une réponse de redirection
  if (offTopic) {
    await prisma.unansweredQuery.create({
      data: { question, locale: opts.locale || 'fr', topScore }
    }).catch(() => {});
  }

  const prompt = await buildRagPrompt(question, chunks);
  const key = await getGeminiKey();
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 }
      })
    }
  );
  const j = await r.json();
  const answer =
    j?.candidates?.[0]?.content?.parts?.[0]?.text ||
    'Je n\'ai pas pu formuler de réponse. Réessaie ?';

  return {
    answer: answer.trim(),
    sources: chunks.map((c) => ({ title: c.docTitle, source: c.source, score: Number(c.score.toFixed(3)) })),
    topScore: Number(topScore.toFixed(3)),
    offTopic
  };
}
