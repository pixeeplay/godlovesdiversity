/**
 * Brain Stats — métriques cognitives du cerveau RAG « Demandez à GLD ».
 *
 * Calcule un état complet de la mémoire :
 *   - Score d'intelligence composite (0-200, échelle façon IQ)
 *   - 5 dimensions cognitives (mémoire / fluidité / diversité / fraîcheur / couverture)
 *   - Projection PCA 2D des embeddings → constellation visuelle
 *   - Top "synapses" (paires de chunks fortement reliés)
 *   - Heatmap thématique (clusters de tags)
 *   - Activité récente (questions résolues, hors-sujet, latence)
 *
 * Tous les calculs sont en JS pur (zéro dépendance), sample limité à 300 chunks
 * pour rester sous 200ms même avec 10k chunks en base.
 */
import { prisma } from './prisma';

const PCA_SAMPLE_MAX = 300;
const SYNAPSE_TOP = 8;
const FRESHNESS_HALF_LIFE_DAYS = 60;

/* ─── TYPES ────────────────────────────────────────────────────── */

export type BrainSnapshot = {
  /** Score composite 0-200 façon IQ, calé pour qu'un RAG bien alimenté soit ~130. */
  iq: number;
  iqLabel: string;
  iqColor: 'gray' | 'amber' | 'emerald' | 'sky' | 'violet';

  /** 5 dimensions cognitives normalisées 0-100. */
  dimensions: {
    memory: number;     // Quantité de chunks indexés (capacité mémoire)
    fluency: number;    // Cohérence du langage (variance des embeddings)
    diversity: number;  // Diversité des sources & tags
    freshness: number;  // Fraîcheur (récence pondérée des ingestions)
    coverage: number;   // Couverture multi-locale & multi-source
  };

  /** Stats brutes pour affichage. */
  stats: {
    docs: number;
    docsEnabled: number;
    chunks: number;
    tokens: number;
    locales: number;
    sourceTypes: number;
    tags: number;
    avgChunkSize: number;
    avgEmbeddingNorm: number;
    oldestDoc?: string;  // ISO date
    newestDoc?: string;
    pendingQuestions: number;
    answeredRate: number;       // 0-1 : fraction questions ayant matché
    avgTopScore: number;        // 0-1 : moyenne des top scores des questions hors-sujet
  };

  /** Constellation : sample 2D des chunks (PCA des embeddings). */
  constellation: ConstellationNode[];

  /** Synapses : top paires de chunks similaires (visualisées comme connexions). */
  synapses: Synapse[];

  /** Top tags / thèmes (heatmap horizontale). */
  topTags: { tag: string; count: number }[];

  /** Distribution des sourceTypes. */
  sourceMix: { type: string; count: number; pct: number }[];

  /** Distribution des locales. */
  localeMix: { locale: string; count: number; pct: number }[];

  /** Timeline d'ingestion (30 derniers jours, par jour). */
  timeline: { date: string; count: number }[];

  /** Dernières questions hors-sujet (zones aveugles). */
  blindSpots: { question: string; topScore: number; createdAt: string }[];

  /** Pulsations vitales (pour animer l'UI). */
  vitals: {
    pulseHz: number;          // Fréquence d'animation suggérée (Hz)
    activityLevel: number;    // 0-100, intensité du halo
    healthLabel: string;      // "Endormi" / "Calme" / "Actif" / "Bouillonnant"
  };

  generatedAt: number; // ms epoch
};

export type ConstellationNode = {
  id: string;
  docId: string;
  docTitle: string;
  x: number;          // -1 à 1
  y: number;          // -1 à 1
  z: number;          // -1 à 1 (3e composante PCA pour viz 3D)
  weight: number;     // tokens normalisés 0-1, taille du point
  cluster: number;    // 0-7 (couleur)
  preview: string;    // 80 premiers chars du chunk
};

export type Synapse = {
  fromId: string;
  toId: string;
  similarity: number;
  fromTitle: string;
  toTitle: string;
};

/* ─── ALGÈBRE LINÉAIRE LÉGÈRE (PCA via power iteration) ────────── */

function meanVector(vecs: number[][]): number[] {
  const dim = vecs[0]?.length || 0;
  const out = new Array(dim).fill(0);
  for (const v of vecs) for (let i = 0; i < dim; i++) out[i] += v[i];
  for (let i = 0; i < dim; i++) out[i] /= vecs.length;
  return out;
}

function subtract(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function normalize(v: number[]): number[] {
  const n = Math.sqrt(dot(v, v));
  if (n < 1e-12) return v.slice();
  return v.map((x) => x / n);
}

/**
 * Power iteration sur la matrice de covariance implicite : X^T X v.
 * Renvoie le vecteur propre dominant. On déflationne pour le 2e.
 */
function powerIteration(centered: number[][], iters = 30): number[] {
  const dim = centered[0].length;
  let v = new Array(dim).fill(0).map(() => Math.random() - 0.5);
  v = normalize(v);
  for (let it = 0; it < iters; it++) {
    // Cv = X^T (X v)
    const xv = centered.map((row) => dot(row, v));
    const next = new Array(dim).fill(0);
    for (let i = 0; i < centered.length; i++) {
      const c = xv[i];
      const row = centered[i];
      for (let j = 0; j < dim; j++) next[j] += c * row[j];
    }
    v = normalize(next);
  }
  return v;
}

function deflate(centered: number[][], v: number[]): number[][] {
  // Retire la composante v de chaque ligne
  return centered.map((row) => {
    const c = dot(row, v);
    return row.map((x, j) => x - c * v[j]);
  });
}

/* ─── CLUSTERING LÉGER (k-means simplifié, k=8, 1 passe) ───────── */

function quickCluster(points: { x: number; y: number }[], k = 8): number[] {
  if (points.length === 0) return [];
  const labels = new Array(points.length).fill(0);
  // Centroïdes : k points pris en arc
  const centroids: { x: number; y: number }[] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i / k) * points.length);
    centroids.push({ ...points[idx] });
  }
  // 5 itérations suffisent pour visuel
  for (let it = 0; it < 5; it++) {
    for (let i = 0; i < points.length; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const dx = points[i].x - centroids[c].x;
        const dy = points[i].y - centroids[c].y;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = c; }
      }
      labels[i] = best;
    }
    // Met à jour centroïdes
    const sums = new Array(k).fill(0).map(() => ({ x: 0, y: 0, n: 0 }));
    for (let i = 0; i < points.length; i++) {
      const l = labels[i];
      sums[l].x += points[i].x;
      sums[l].y += points[i].y;
      sums[l].n++;
    }
    for (let c = 0; c < k; c++) {
      if (sums[c].n > 0) {
        centroids[c].x = sums[c].x / sums[c].n;
        centroids[c].y = sums[c].y / sums[c].n;
      }
    }
  }
  return labels;
}

/* ─── HELPERS NORMALISATION ────────────────────────────────────── */

function clamp(x: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, x));
}

function logScale(value: number, max: number): number {
  // 0 → 0, max → ~100, croissance log
  if (value <= 0) return 0;
  return clamp((Math.log10(1 + value) / Math.log10(1 + max)) * 100);
}

function freshnessScore(createdDates: Date[]): number {
  if (createdDates.length === 0) return 0;
  const now = Date.now();
  let sum = 0;
  for (const d of createdDates) {
    const ageDays = (now - d.getTime()) / 86_400_000;
    // Demi-vie 60 jours
    sum += Math.pow(0.5, ageDays / FRESHNESS_HALF_LIFE_DAYS);
  }
  return clamp((sum / createdDates.length) * 100);
}

function iqLabel(iq: number): { label: string; color: BrainSnapshot['iqColor'] } {
  if (iq < 50) return { label: 'Embryon', color: 'gray' };
  if (iq < 90) return { label: 'Apprenti', color: 'amber' };
  if (iq < 120) return { label: 'Compétent', color: 'emerald' };
  if (iq < 150) return { label: 'Expert', color: 'sky' };
  return { label: 'Génie', color: 'violet' };
}

/* ─── CALCUL PRINCIPAL ─────────────────────────────────────────── */

export async function computeBrainSnapshot(): Promise<BrainSnapshot> {
  // 1. Charge tout (limité, on est dans le RAG GLD pas Wikipedia)
  const [docs, chunks, unanswered] = await Promise.all([
    prisma.knowledgeDoc.findMany({
      select: {
        id: true, title: true, sourceType: true, locale: true, tags: true,
        enabled: true, createdAt: true,
      },
    }),
    prisma.knowledgeChunk.findMany({
      select: {
        id: true, docId: true, text: true, embedding: true, tokens: true,
        doc: { select: { title: true, enabled: true } },
      },
      take: 5000, // safeguard
    }),
    prisma.unansweredQuery.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { question: true, topScore: true, createdAt: true, status: true },
    }),
  ]);

  // 2. Stats brutes
  const enabledChunks = chunks.filter((c) => c.doc.enabled);
  const totalTokens = enabledChunks.reduce((s, c) => s + c.tokens, 0);
  const docDates = docs.map((d) => d.createdAt);
  const docsByDate = [...docDates].sort((a, b) => a.getTime() - b.getTime());

  const localeSet = new Set(docs.map((d) => d.locale));
  const sourceTypeSet = new Set(docs.map((d) => d.sourceType));
  const tagSet = new Set(docs.flatMap((d) => d.tags));

  // 3. Embeddings : sample représentatif
  const validEmbeddings = enabledChunks
    .filter((c) => Array.isArray(c.embedding) && (c.embedding as number[]).length > 100)
    .map((c) => ({
      id: c.id, docId: c.docId, docTitle: c.doc.title,
      text: c.text, tokens: c.tokens,
      vec: c.embedding as unknown as number[],
    }));

  // Échantillon stratifié : on prend uniformément
  const sample = validEmbeddings.length <= PCA_SAMPLE_MAX
    ? validEmbeddings
    : (() => {
        const step = validEmbeddings.length / PCA_SAMPLE_MAX;
        return Array.from({ length: PCA_SAMPLE_MAX }, (_, i) => validEmbeddings[Math.floor(i * step)]);
      })();

  // 4. PCA si on a au moins 3 vecteurs
  let constellation: ConstellationNode[] = [];
  let avgEmbeddingNorm = 0;
  if (sample.length >= 3) {
    const vecs = sample.map((s) => s.vec);
    const mu = meanVector(vecs);
    const centered = vecs.map((v) => subtract(v, mu));

    // Normes (mesure de "fluency" — vecteurs bien définis)
    avgEmbeddingNorm = vecs.reduce((s, v) => s + Math.sqrt(dot(v, v)), 0) / vecs.length;

    const v1 = powerIteration(centered, 25);
    const deflated1 = deflate(centered, v1);
    const v2 = powerIteration(deflated1, 25);
    const deflated2 = deflate(deflated1, v2);
    const v3 = powerIteration(deflated2, 25);

    const projected = centered.map((row) => ({
      x: dot(row, v1),
      y: dot(row, v2),
      z: dot(row, v3),
    }));

    // Normalise dans [-1, 1]
    const xs = projected.map((p) => p.x);
    const ys = projected.map((p) => p.y);
    const zs = projected.map((p) => p.z);
    const xMax = Math.max(...xs.map(Math.abs)) || 1;
    const yMax = Math.max(...ys.map(Math.abs)) || 1;
    const zMax = Math.max(...zs.map(Math.abs)) || 1;
    const normProj = projected.map((p) => ({ x: p.x / xMax, y: p.y / yMax, z: p.z / zMax }));

    const labels = quickCluster(normProj, 8);
    const tokenMax = Math.max(...sample.map((s) => s.tokens), 1);

    constellation = sample.map((s, i) => ({
      id: s.id,
      docId: s.docId,
      docTitle: s.docTitle,
      x: normProj[i].x,
      y: normProj[i].y,
      z: normProj[i].z,
      weight: 0.3 + 0.7 * (s.tokens / tokenMax),
      cluster: labels[i],
      preview: s.text.replace(/\s+/g, ' ').trim().slice(0, 80),
    }));
  }

  // 5. Synapses : top similarités cosinus dans l'échantillon (cap)
  const synapses: Synapse[] = [];
  if (sample.length >= 4) {
    const cosineCache: number[] = sample.map((s) => Math.sqrt(dot(s.vec, s.vec)) || 1);
    const candidates: Synapse[] = [];
    const checkLimit = Math.min(sample.length, 80);
    for (let i = 0; i < checkLimit; i++) {
      for (let j = i + 1; j < checkLimit; j++) {
        if (sample[i].docId === sample[j].docId) continue; // Synapse INTER-docs
        const sim = dot(sample[i].vec, sample[j].vec) / (cosineCache[i] * cosineCache[j]);
        if (sim > 0.55) {
          candidates.push({
            fromId: sample[i].id,
            toId: sample[j].id,
            similarity: sim,
            fromTitle: sample[i].docTitle,
            toTitle: sample[j].docTitle,
          });
        }
      }
    }
    candidates.sort((a, b) => b.similarity - a.similarity);
    synapses.push(...candidates.slice(0, SYNAPSE_TOP));
  }

  // 6. Top tags
  const tagCounts = new Map<string, number>();
  for (const d of docs) for (const t of d.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag, count]) => ({ tag, count }));

  // 7. Source / locale mix
  const sourceMixMap = new Map<string, number>();
  for (const d of docs) sourceMixMap.set(d.sourceType, (sourceMixMap.get(d.sourceType) || 0) + 1);
  const sourceMix = [...sourceMixMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count, pct: Math.round((count / Math.max(1, docs.length)) * 100) }));

  const localeMixMap = new Map<string, number>();
  for (const d of docs) localeMixMap.set(d.locale, (localeMixMap.get(d.locale) || 0) + 1);
  const localeMix = [...localeMixMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([locale, count]) => ({ locale, count, pct: Math.round((count / Math.max(1, docs.length)) * 100) }));

  // 8. Timeline 30j
  const timeline: { date: string; count: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const dStr = d.toISOString().slice(0, 10);
    const next = new Date(d.getTime() + 86_400_000);
    const count = docs.filter((doc) => doc.createdAt >= d && doc.createdAt < next).length;
    timeline.push({ date: dStr, count });
  }

  // 9. Activité (questions hors-sujet récentes = zones aveugles)
  const blindSpots = unanswered
    .filter((q) => q.status === 'PENDING')
    .slice(0, 6)
    .map((q) => ({
      question: q.question,
      topScore: Number(q.topScore.toFixed(3)),
      createdAt: q.createdAt.toISOString(),
    }));

  const totalQuestions = unanswered.length;
  const answeredRate = totalQuestions > 0
    ? unanswered.filter((q) => q.status === 'ANSWERED').length / totalQuestions
    : 0;
  const avgTopScore = totalQuestions > 0
    ? unanswered.reduce((s, q) => s + q.topScore, 0) / totalQuestions
    : 0;

  // 10. Dimensions cognitives (5 axes 0-100)
  const memory = logScale(enabledChunks.length, 5000); // 5k chunks ≈ 100
  const fluency = clamp(avgEmbeddingNorm > 0 ? Math.min(100, avgEmbeddingNorm * 50 + 50) : 0);
  const tagDiversity = logScale(tagSet.size, 50);
  const sourceDiversity = logScale(sourceTypeSet.size * 25, 100);
  const diversity = clamp((tagDiversity + sourceDiversity) / 2);
  const freshness = freshnessScore(docDates);
  const localeCoverage = logScale(localeSet.size * 25, 100);
  const ratioEnabled = docs.length > 0 ? docs.filter((d) => d.enabled).length / docs.length : 0;
  const coverage = clamp((localeCoverage + ratioEnabled * 100) / 2);

  // 11. IQ composite (échelle 0-200, calé pour qu'un RAG bien rempli soit ~130-140)
  // Pondération : mémoire (×1.5), fluidité (×1), diversité (×1), fraîcheur (×0.7), couverture (×0.8)
  const weighted =
    (memory * 1.5 + fluency * 1.0 + diversity * 1.0 + freshness * 0.7 + coverage * 0.8) /
    (1.5 + 1.0 + 1.0 + 0.7 + 0.8);
  const iq = Math.round(clamp(weighted * 1.6, 0, 200));
  const { label: iqL, color: iqC } = iqLabel(iq);

  // 12. Vitals (pour animer l'UI)
  const recentDocs = docs.filter((d) => Date.now() - d.createdAt.getTime() < 7 * 86_400_000).length;
  const activityLevel = clamp(recentDocs * 8 + (1 - answeredRate) * 30 + memory * 0.5);
  const pulseHz = 0.5 + (activityLevel / 100) * 1.5; // 0.5 à 2 Hz
  const healthLabel =
    activityLevel < 20 ? 'Endormi' :
    activityLevel < 50 ? 'Calme' :
    activityLevel < 80 ? 'Actif' : 'Bouillonnant';

  return {
    iq,
    iqLabel: iqL,
    iqColor: iqC,
    dimensions: {
      memory: Math.round(memory),
      fluency: Math.round(fluency),
      diversity: Math.round(diversity),
      freshness: Math.round(freshness),
      coverage: Math.round(coverage),
    },
    stats: {
      docs: docs.length,
      docsEnabled: docs.filter((d) => d.enabled).length,
      chunks: chunks.length,
      tokens: totalTokens,
      locales: localeSet.size,
      sourceTypes: sourceTypeSet.size,
      tags: tagSet.size,
      avgChunkSize: chunks.length > 0
        ? Math.round(chunks.reduce((s, c) => s + c.text.length, 0) / chunks.length)
        : 0,
      avgEmbeddingNorm: Number(avgEmbeddingNorm.toFixed(3)),
      oldestDoc: docsByDate[0]?.toISOString(),
      newestDoc: docsByDate[docsByDate.length - 1]?.toISOString(),
      pendingQuestions: unanswered.filter((q) => q.status === 'PENDING').length,
      answeredRate: Number(answeredRate.toFixed(3)),
      avgTopScore: Number(avgTopScore.toFixed(3)),
    },
    constellation,
    synapses,
    topTags,
    sourceMix,
    localeMix,
    timeline,
    blindSpots,
    vitals: {
      pulseHz: Number(pulseHz.toFixed(2)),
      activityLevel: Math.round(activityLevel),
      healthLabel,
    },
    generatedAt: Date.now(),
  };
}
