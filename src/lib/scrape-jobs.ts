/**
 * Store en mémoire des jobs de scraping RAG.
 *
 * Pourquoi en mémoire et pas en DB ?
 *   - Le serveur Next.js singleton garde le state entre requêtes (Edge n'est PAS utilisé ici)
 *   - On ne veut pas polluer la DB avec des logs éphémères de progression
 *   - Coolify redémarre le container → tout job en cours est perdu (acceptable, l'admin relance)
 *
 * Le polling côté UI (1s) lit `getJob(id)` et reflète l'état en live.
 *
 * Si on veut un vrai persistant un jour : remplacer le Map par Prisma + table ScrapeJob.
 */
import { scrapeUrlForRag, type ScrapeResult } from './jina-scraper';
import { ingestDocument } from './rag';

export type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled';

export type JobLog = {
  ts: number;
  level: 'info' | 'warn' | 'error';
  msg: string;
};

export type JobResult = {
  url: string;
  ok: boolean;
  title?: string;
  bytes?: number;
  source?: 'jina' | 'fetch';
  ingested?: boolean;
  docId?: string;
  chunkCount?: number;
  error?: string;
};

export type ScrapeJob = {
  id: string;
  status: JobStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  total: number;
  done: number;
  errors: number;
  currentUrl?: string;
  results: JobResult[];
  logs: JobLog[];
  options: ScrapeJobOptions;
};

export type ScrapeJobOptions = {
  /** Liste d'URLs à scraper. */
  urls: string[];
  /** Active l'enrichissement Gemini (lang/tags/summary). Défaut false. */
  summarize?: boolean;
  /** Ingère directement dans le RAG (chunk + embed + store). Défaut true. */
  ingest?: boolean;
  /** Bypass Jina (utiliser fetch direct). Défaut false. */
  skipJina?: boolean;
  /** Concurrence (workers parallèles). Défaut 3. */
  concurrency?: number;
  /** Mode discret anti-blacklist (UA rotation, throttle, backoff). Défaut true. */
  polite?: boolean;
  /** Override du delay min entre 2 requêtes au même hostname. */
  hostDelayMs?: number;
  /** Tags appliqués à tous les docs ingérés. */
  tags?: string[];
  /** Locale forcée pour l'ingestion. Défaut 'fr'. */
  locale?: string;
};

/* ─── STORE GLOBAL (singleton) ────────────────────────────────── */

declare global {
  // eslint-disable-next-line no-var
  var __scrapeJobs: Map<string, ScrapeJob> | undefined;
  // eslint-disable-next-line no-var
  var __scrapeCancelFlags: Map<string, boolean> | undefined;
}

const jobs: Map<string, ScrapeJob> = global.__scrapeJobs || new Map();
const cancelFlags: Map<string, boolean> = global.__scrapeCancelFlags || new Map();
if (process.env.NODE_ENV !== 'production') {
  global.__scrapeJobs = jobs;
  global.__scrapeCancelFlags = cancelFlags;
}

/* ─── HELPERS ──────────────────────────────────────────────────── */

function newId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pushLog(job: ScrapeJob, level: JobLog['level'], msg: string) {
  job.logs.push({ ts: Date.now(), level, msg });
  if (job.logs.length > 500) job.logs.splice(0, job.logs.length - 500);
}

function gcOldJobs() {
  // Garde les 50 derniers et vire ceux > 24h
  const now = Date.now();
  const all = [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
  for (let i = 50; i < all.length; i++) jobs.delete(all[i].id);
  for (const [id, j] of jobs) if (now - j.createdAt > 24 * 3600_000) jobs.delete(id);
}

/* ─── API PUBLIQUE ─────────────────────────────────────────────── */

export function getJob(id: string): ScrapeJob | undefined {
  return jobs.get(id);
}

export function listJobs(limit = 20): ScrapeJob[] {
  return [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export function cancelJob(id: string): boolean {
  const j = jobs.get(id);
  if (!j || j.status === 'done' || j.status === 'error' || j.status === 'cancelled') return false;
  cancelFlags.set(id, true);
  pushLog(j, 'warn', 'Annulation demandée par l\'admin');
  return true;
}

/**
 * Crée et démarre un job de scraping en arrière-plan.
 * Retourne immédiatement le job (status 'queued' → 'running' au prochain tick).
 * L'UI poll ensuite GET /api/admin/knowledge/scrape/[id] pour voir l'avancement.
 */
export function startScrapeJob(opts: ScrapeJobOptions): ScrapeJob {
  gcOldJobs();
  const id = newId();
  const job: ScrapeJob = {
    id,
    status: 'queued',
    createdAt: Date.now(),
    total: opts.urls.length,
    done: 0,
    errors: 0,
    results: [],
    logs: [{ ts: Date.now(), level: 'info', msg: `Job créé avec ${opts.urls.length} URL(s)` }],
    options: opts,
  };
  jobs.set(id, job);

  // Lance le worker en async (fire-and-forget)
  runJob(id).catch((e) => {
    const j = jobs.get(id);
    if (!j) return;
    j.status = 'error';
    j.finishedAt = Date.now();
    pushLog(j, 'error', `Crash worker : ${e?.message || 'unknown'}`);
  });

  return job;
}

/* ─── WORKER ──────────────────────────────────────────────────── */

async function runJob(id: string): Promise<void> {
  const job = jobs.get(id);
  if (!job) return;

  job.status = 'running';
  job.startedAt = Date.now();
  pushLog(job, 'info', 'Démarrage du worker');

  const concurrency = Math.max(1, Math.min(job.options.concurrency ?? 3, 8));
  const queue = [...job.options.urls];
  const ingest = job.options.ingest !== false;

  const worker = async (workerId: number) => {
    while (queue.length > 0) {
      if (cancelFlags.get(id)) return;
      const url = queue.shift();
      if (!url) break;
      job.currentUrl = url;
      pushLog(job, 'info', `[w${workerId}] ↓ ${url}`);

      const result: JobResult = { url, ok: false };

      try {
        const scraped: ScrapeResult = await scrapeUrlForRag(url, {
          summarize: job.options.summarize,
          skipJina: job.options.skipJina,
          polite: job.options.polite,
        });
        result.title = scraped.title;
        result.bytes = scraped.bytes;
        result.source = scraped.source;
        result.ok = true;

        if (scraped.warning) pushLog(job, 'warn', `${url} : ${scraped.warning}`);

        if (ingest && scraped.content && scraped.content.length > 100) {
          try {
            const ing = await ingestDocument({
              title: scraped.title,
              content: scraped.content,
              source: scraped.url,
              sourceType: 'url',
              tags: [...(job.options.tags ?? []), ...(scraped.tags ?? [])],
              locale: scraped.lang || job.options.locale || 'fr',
            });
            result.docId = ing.doc.id;
            result.chunkCount = ing.chunkCount;
            result.ingested = true;
            pushLog(job, 'info', `[w${workerId}] ✓ ${url} (${scraped.bytes}o, ${ing.chunkCount} chunks)`);
          } catch (e: any) {
            result.error = `Ingestion KO : ${e?.message || 'unknown'}`;
            pushLog(job, 'error', `[w${workerId}] ⚠ ingestion ${url} : ${e?.message}`);
          }
        } else {
          pushLog(job, 'info', `[w${workerId}] ✓ ${url} (${scraped.bytes}o, scrape only)`);
        }
      } catch (e: any) {
        result.ok = false;
        result.error = e?.message || 'scrape failed';
        job.errors++;
        pushLog(job, 'error', `[w${workerId}] ✗ ${url} : ${e?.message}`);
      }

      job.results.push(result);
      job.done++;
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  if (cancelFlags.get(id)) {
    job.status = 'cancelled';
    pushLog(job, 'warn', `Annulé après ${job.done}/${job.total} pages`);
    cancelFlags.delete(id);
  } else if (job.errors === job.total && job.total > 0) {
    job.status = 'error';
    pushLog(job, 'error', `Toutes les ${job.total} pages ont échoué`);
  } else {
    job.status = 'done';
    pushLog(job, 'info', `✓ Terminé : ${job.done}/${job.total} (${job.errors} erreur(s))`);
  }
  job.finishedAt = Date.now();
  job.currentUrl = undefined;
}
