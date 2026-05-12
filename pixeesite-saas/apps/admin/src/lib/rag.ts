/**
 * Tenant-scoped RAG helpers (port faithful de GLD /src/lib/rag.ts).
 *
 * Pipeline :
 *   ingestSource(source)  →  chunk(text)  →  embed(chunk)  →  store
 *   search(question)      →  embed(q) → cosineSearch(top K)
 *
 * Embedding : Gemini text-embedding-004 (768 dim).
 * Stockage  : RagSource + RagChunk dans la DB tenant (raw SQL,
 *             tables crées par tenant-init.ts).
 */
import { randomUUID } from 'crypto';

const EMBED_MODELS = [
  'gemini-embedding-001',
  'text-embedding-004',
  'embedding-001',
];
const CHUNK_SIZE_WORDS = 220;
const CHUNK_OVERLAP_WORDS = 40;
const TOP_K = 5;

let workingEmbedModel: string | null = null;

async function tryEmbed(
  model: string,
  key: string,
  text: string,
  version: 'v1' | 'v1beta' = 'v1beta',
): Promise<{ values: number[] } | { error: string }> {
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/${version}/models/${model}:embedContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        }),
      },
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

export async function embedText(geminiKey: string, text: string): Promise<number[]> {
  if (workingEmbedModel) {
    const [version, model] = workingEmbedModel.split('|') as ['v1' | 'v1beta', string];
    const r = await tryEmbed(model, geminiKey, text, version);
    if ('values' in r) return r.values;
    workingEmbedModel = null;
  }
  const errors: string[] = [];
  for (const version of ['v1', 'v1beta'] as const) {
    for (const model of EMBED_MODELS) {
      const r = await tryEmbed(model, geminiKey, text, version);
      if ('values' in r) {
        workingEmbedModel = `${version}|${model}`;
        return r.values;
      }
      errors.push((r as any).error);
    }
  }
  throw new Error(`Embedding Gemini impossible. ${errors.slice(0, 2).join(' | ')}`);
}

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const words = cleaned.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + CHUNK_SIZE_WORDS).join(' '));
    i += CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS;
    if (i <= 0) break;
  }
  return chunks.filter((c) => c.length > 30);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

export type IngestInput = {
  name: string;
  type: string; // 'text' | 'url' | 'pdf'
  url?: string | null;
  content: string;
  config?: any;
};

export async function ingestSource(db: any, geminiKey: string, input: IngestInput) {
  const sourceId = randomUUID();
  await db.$executeRawUnsafe(
    `INSERT INTO "RagSource" ("id", "name", "type", "url", "config", "chunksCount", "tokensCount", "active", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5::jsonb, 0, 0, true, NOW(), NOW())`,
    sourceId,
    input.name,
    input.type,
    input.url || null,
    JSON.stringify(input.config || {}),
  );

  const pieces = chunkText(input.content);
  let okCount = 0;
  let tokensTotal = 0;
  for (let i = 0; i < pieces.length; i++) {
    const text = pieces[i];
    try {
      const embedding = await embedText(geminiKey, text);
      const tokens = Math.round(text.length / 4);
      tokensTotal += tokens;
      await db.$executeRawUnsafe(
        `INSERT INTO "RagChunk" ("id", "sourceId", "text", "embedding", "metadata", "position", "tokens", "createdAt")
         VALUES ($1, $2, $3, $4::double precision[], $5::jsonb, $6, $7, NOW())`,
        randomUUID(),
        sourceId,
        text,
        embedding,
        JSON.stringify({}),
        i,
        tokens,
      );
      okCount++;
    } catch (e) {
      console.error('embed chunk failed', i, e);
    }
  }

  await db.$executeRawUnsafe(
    `UPDATE "RagSource" SET "chunksCount"=$1, "tokensCount"=$2, "lastIndexedAt"=NOW(), "updatedAt"=NOW() WHERE "id"=$3`,
    okCount,
    tokensTotal,
    sourceId,
  );

  return { sourceId, chunkCount: okCount, tokensCount: tokensTotal };
}

export async function reindexSource(db: any, geminiKey: string, sourceId: string, content: string) {
  await db.$executeRawUnsafe(`DELETE FROM "RagChunk" WHERE "sourceId" = $1`, sourceId);
  const pieces = chunkText(content);
  let okCount = 0;
  let tokensTotal = 0;
  for (let i = 0; i < pieces.length; i++) {
    const text = pieces[i];
    try {
      const embedding = await embedText(geminiKey, text);
      const tokens = Math.round(text.length / 4);
      tokensTotal += tokens;
      await db.$executeRawUnsafe(
        `INSERT INTO "RagChunk" ("id", "sourceId", "text", "embedding", "metadata", "position", "tokens", "createdAt")
         VALUES ($1, $2, $3, $4::double precision[], $5::jsonb, $6, $7, NOW())`,
        randomUUID(), sourceId, text, embedding, JSON.stringify({}), i, tokens,
      );
      okCount++;
    } catch (e) { console.error('reindex chunk failed', i, e); }
  }
  await db.$executeRawUnsafe(
    `UPDATE "RagSource" SET "chunksCount"=$1, "tokensCount"=$2, "lastIndexedAt"=NOW(), "updatedAt"=NOW() WHERE "id"=$3`,
    okCount, tokensTotal, sourceId,
  );
  return { chunkCount: okCount, tokensCount: tokensTotal };
}

export type RetrievedChunk = {
  chunkId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string | null;
  text: string;
  score: number;
};

export async function searchTenant(
  db: any,
  geminiKey: string,
  query: string,
  topK = TOP_K,
): Promise<RetrievedChunk[]> {
  const rows = await db.$queryRawUnsafe<any[]>(
    `SELECT c."id" as "chunkId", c."sourceId", c."text", c."embedding", s."name" as "sourceName", s."url" as "sourceUrl"
     FROM "RagChunk" c JOIN "RagSource" s ON s."id" = c."sourceId"
     WHERE s."active" = true`,
  );
  if (!rows.length) return [];
  const queryVec = await embedText(geminiKey, query);
  const scored = rows.map((c) => {
    const emb = Array.isArray(c.embedding) ? c.embedding : [];
    return {
      chunkId: c.chunkId,
      sourceId: c.sourceId,
      sourceName: c.sourceName,
      sourceUrl: c.sourceUrl,
      text: c.text,
      score: cosine(queryVec, emb),
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function fetchUrlContent(url: string): Promise<string> {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Pixeesite-RAG/1.0' } });
  if (!r.ok) throw new Error(`fetch ${r.status}`);
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) return JSON.stringify(await r.json());
  const html = await r.text();
  // strip tags, condense whitespace
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
