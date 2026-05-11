'use client';
/**
 * OrgScraperWorkbench — port faithful du ScraperWorkbench GLD vers multi-tenant Pixeesite.
 *
 * Étapes guidées :
 *   1. SOURCE      : URL racine + profondeur + sécurité (robots.txt, subdomains, externes)
 *   2. EXPLORATION : POST /api/orgs/[slug]/scraper-jobs/explore → arbre TreeView avec checkbox
 *   3. SCRAPING    : POST /api/orgs/[slug]/scraper-jobs avec URLs sélectionnées
 *   4. PROGRESSION : polling 1s sur GET /scraper-jobs/[id] → barre + logs streaming
 */
import { useEffect, useMemo, useRef, useState } from 'react';

/* ─── TYPES ────────────────────────────────────────────────────── */

type CrawlNode = {
  url: string;
  title?: string;
  depth: number;
  children: CrawlNode[];
  status: 'ok' | 'error' | 'skipped';
  reason?: string;
};

type ExploreResult = {
  root: CrawlNode;
  totalPages: number;
  rootUrl: string;
  source: 'sitemap' | 'bfs';
  warnings: string[];
};

type JobLog = { ts: number; level: 'info' | 'warn' | 'error'; msg: string };
type JobResult = {
  url: string;
  ok: boolean;
  title?: string;
  bytes?: number;
  bytesRaw?: number;
  cleanRemovedPct?: number;
  cleanerMode?: string;
  durationMs?: number;
  source?: string;
  ingested?: boolean;
  chunkCount?: number;
  error?: string;
};
type Job = {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error' | 'cancelled';
  total: number;
  done: number;
  errors: number;
  progress: number;
  currentUrl?: string;
  logs: JobLog[];
  results: JobResult[];
  startedAt?: number;
  finishedAt?: number;
};

/* ─── HELPERS UI ───────────────────────────────────────────────── */

function flatten(node: CrawlNode): CrawlNode[] {
  const out: CrawlNode[] = [node];
  for (const c of node.children) out.push(...flatten(c));
  return out;
}

function shortPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? '/' : u.pathname;
  } catch {
    return url;
  }
}

function normalizeClientUrl(raw: string): string {
  let u = (raw || '').trim();
  u = u.replace(/[​-‍﻿]/g, '');
  u = u.replace(/^(https?:\/\/)+/i, 'https://');
  u = u.replace(/^https?:\/\/(https?)(:?)\/\//i, () => 'https://');
  u = u.replace(/^(https?)\/\/(?!\/)/i, '$1://');
  if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
  u = u.replace(/:\/{2,}/g, '://');
  return u;
}

function fmtBytes(n?: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} ko`;
  return `${(n / 1024 / 1024).toFixed(2)} Mo`;
}

function fmtDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m${s.toString().padStart(2, '0')}`;
}

/* ─── COMPOSANT PRINCIPAL ──────────────────────────────────────── */

export function OrgScraperWorkbench({ orgSlug }: { orgSlug: string }) {
  // Étape 1 — config source
  const [url, setUrl] = useState('');
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(50);
  const [respectRobots, setRespectRobots] = useState(true);
  const [includeSubdomains, setIncludeSubdomains] = useState(false);
  const [followExternal, setFollowExternal] = useState(false);
  const [skipJina, setSkipJina] = useState(false);
  const [summarize, setSummarize] = useState(false);
  const [ingest, setIngest] = useState(true);
  const [politeMode, setPoliteMode] = useState(true);
  const [hostDelayMs, setHostDelayMs] = useState(2500);
  const [cleaner, setCleaner] = useState<'off' | 'standard' | 'aggressive' | 'gemini'>('aggressive');
  const [cleanerHint, setCleanerHint] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [importToLeads, setImportToLeads] = useState(true);
  const [country, setCountry] = useState('FR');
  const [target, setTarget] = useState<'b2b' | 'b2c'>('b2b');

  // Étape 2 — exploration
  const [exploring, setExploring] = useState(false);
  const [tree, setTree] = useState<ExploreResult | null>(null);
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Étape 3 — job
  const [job, setJob] = useState<Job | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Liste des jobs existants
  const [pastJobs, setPastJobs] = useState<any[]>([]);
  async function loadPastJobs() {
    const r = await fetch(`/api/orgs/${orgSlug}/scraper-jobs`).catch(() => null);
    if (!r || !r.ok) return;
    const j = await r.json();
    setPastJobs(j.items || []);
  }
  useEffect(() => { loadPastJobs(); /* eslint-disable-next-line */ }, []);

  /* ─── Étape 1 → 2 : Explorer ────────────────────────── */

  const handleExplore = async () => {
    const cleanUrl = normalizeClientUrl(url);
    if (!cleanUrl || !/^https?:\/\/[^/]+\.[^/]+/.test(cleanUrl)) {
      setExploreError('URL invalide. Exemple : exemple.com ou https://exemple.com');
      return;
    }
    setExploring(true);
    setExploreError(null);
    setTree(null);
    setSelected(new Set());
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/scraper-jobs/explore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl, maxDepth, maxPages, respectRobots, includeSubdomains, followExternal,
          polite: politeMode, hostDelayMs,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Exploration KO');
      setTree(j);
      // Présélectionne toutes les pages
      setSelected(new Set(flatten(j.root).map((n) => n.url)));
    } catch (e: any) {
      setExploreError(e?.message || 'Erreur inconnue');
    } finally {
      setExploring(false);
    }
  };

  /* ─── Étape 2 → 3 : Lancer le scraping ──────────────── */

  const handleScrape = async () => {
    if (selected.size === 0) {
      setScrapeError('Sélectionne au moins une page');
      return;
    }
    setScrapeError(null);
    setJob(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/scraper-jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [...selected],
          summarize,
          ingest,
          skipJina,
          concurrency: politeMode ? 1 : 3,
          polite: politeMode,
          hostDelayMs,
          cleaner,
          cleanerHint: cleanerHint.trim() || undefined,
          tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
          importToLeads,
          country,
          target,
          sourceUrl: normalizeClientUrl(url),
          depth: maxDepth,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Démarrage KO');
      // Polling
      if (pollRef.current) clearInterval(pollRef.current);
      const poll = async () => {
        try {
          const rr = await fetch(`/api/orgs/${orgSlug}/scraper-jobs/${j.id}`);
          if (!rr.ok) return;
          const jj = await rr.json();
          setJob(jj);
          if (['done', 'error', 'cancelled'].includes(jj.status)) {
            if (pollRef.current) clearInterval(pollRef.current);
            loadPastJobs();
          }
        } catch { /* ignore */ }
      };
      poll();
      pollRef.current = setInterval(poll, 1000);
    } catch (e: any) {
      setScrapeError(e?.message || 'Erreur inconnue');
    }
  };

  const handleCancel = async () => {
    if (!job) return;
    await fetch(`/api/orgs/${orgSlug}/scraper-jobs/${job.id}`, { method: 'DELETE' });
  };

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  /* ─── ARBRE : sélection récursive ────────────────────── */

  const toggleNode = (node: CrawlNode, value: boolean) => {
    const next = new Set(selected);
    for (const n of flatten(node)) value ? next.add(n.url) : next.delete(n.url);
    setSelected(next);
  };

  const toggleCollapsed = (u: string) => {
    const next = new Set(collapsed);
    next.has(u) ? next.delete(u) : next.add(u);
    setCollapsed(next);
  };

  const allUrls = useMemo(() => (tree ? flatten(tree.root).map((n) => n.url) : []), [tree]);

  /* ─── RENDER ─────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🕸️ Scraper leads &amp; RAG</h1>
            <p className="text-sm text-zinc-400">
              Explore un site, choisis visuellement les pages, extrait les contacts (emails, téléphones, social) + ingère dans le RAG tenant.
            </p>
          </div>
        </header>

        {/* ÉTAPE 1 — CONFIG */}
        <Section step={1} title="Source à scraper" subtitle="Quelle URL, jusqu&apos;à quelle profondeur, et quels garde-fous appliquer.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>URL racine</Label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (pasted) { e.preventDefault(); setUrl(normalizeClientUrl(pasted)); }
                }}
                placeholder="exemple.com ou https://exemple.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              {url && url !== normalizeClientUrl(url) && (
                <div className="mt-1 rounded bg-amber-950/50 px-2 py-1 text-xs text-amber-300 ring-1 ring-amber-800">
                  → URL nettoyée : <code className="font-mono">{normalizeClientUrl(url)}</code>
                </div>
              )}
              <Hint>Le scraper part de cette URL et explore les liens internes.</Hint>
            </div>

            <div>
              <Label>Profondeur max : <span className="font-mono text-rose-400">{maxDepth}</span></Label>
              <input type="range" min={1} max={5} step={1} value={maxDepth} onChange={(e) => setMaxDepth(Number(e.target.value))} className="w-full accent-rose-500" />
              <div className="flex justify-between text-xs text-zinc-400">
                <span>1 (racine)</span><span>3 (recommandé)</span><span>5 (lourd)</span>
              </div>
            </div>

            <div>
              <Label>Pages max : <span className="font-mono text-rose-400">{maxPages}</span></Label>
              <input type="range" min={5} max={500} step={5} value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value))} className="w-full accent-rose-500" />
              <Hint>Plafond dur pour éviter de partir en vrille sur un gros site.</Hint>
            </div>

            <div>
              <Label>Tags appliqués aux leads &amp; docs ingérés</Label>
              <input
                type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                placeholder="prospect, salon-mariage, b2b"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              <Hint>Séparés par des virgules.</Hint>
            </div>

            <div>
              <Label>Pays par défaut (parsing téléphones)</Label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                <option value="FR">France (FR)</option>
                <option value="BE">Belgique (BE)</option>
                <option value="CH">Suisse (CH)</option>
                <option value="CA">Canada (CA)</option>
                <option value="US">USA (US)</option>
                <option value="GB">Royaume-Uni (GB)</option>
                <option value="DE">Allemagne (DE)</option>
                <option value="ES">Espagne (ES)</option>
                <option value="IT">Italie (IT)</option>
              </select>
            </div>

            <div>
              <Label>Cible (target)</Label>
              <select value={target} onChange={(e) => setTarget(e.target.value as any)} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                <option value="b2b">B2B (entreprises, pros)</option>
                <option value="b2c">B2C (particuliers)</option>
              </select>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-xl bg-zinc-900 p-4 ring-1 ring-zinc-800 md:grid-cols-2">
            <Toggle label="🛡️ Respecter robots.txt" hint="Bloque les pages interdites par le site (recommandé)." value={respectRobots} onChange={setRespectRobots} />
            <Toggle label="🥷 Mode discret (anti-blacklist)" hint="UA rotation + throttle + backoff sur 429/503 + fallback Jina si bloqué." value={politeMode} onChange={setPoliteMode} />
            <Toggle label="🌐 Inclure sous-domaines" hint="Crawl aussi blog.site.com, m.site.com, etc." value={includeSubdomains} onChange={setIncludeSubdomains} />
            <Toggle label="↗️ Suivre liens externes" hint="⚠️ Peut exploser le scope." value={followExternal} onChange={setFollowExternal} />
            <Toggle label="🚫 Bypass Jina (fetch direct)" hint="Désactive le rendu JS. Plus rapide mais perd les SPA." value={skipJina} onChange={setSkipJina} />
            <Toggle label="✨ Enrichissement Gemini" hint="Détecte langue + résumé + tags auto. ~0.0002$/page." value={summarize} onChange={setSummarize} />
            <Toggle label="📥 Ingérer dans le RAG" hint="Si désactivé : scrape seulement (sans pollution DB)." value={ingest} onChange={setIngest} />
            <Toggle label="🎯 Import contacts → Leads" hint="Upsert les emails/téléphones trouvés dans la table Lead." value={importToLeads} onChange={setImportToLeads} />
          </div>

          {/* CLEANER */}
          <div className="mt-3 rounded-xl bg-violet-950/40 p-4 ring-1 ring-violet-800/60">
            <Label>🧹 Nettoyage du contenu (CRITIQUE pour la qualité RAG)</Label>
            <div className="mt-2 grid gap-2 md:grid-cols-4">
              {([
                { val: 'off',        emoji: '🚫', label: 'Aucun',        hint: 'Markdown Jina brut (avec menus)' },
                { val: 'standard',   emoji: '🧽', label: 'Standard',     hint: 'Vire menus & images-icônes' },
                { val: 'aggressive', emoji: '🧹', label: 'Aggressive',   hint: 'Vire tout le chrome web' },
                { val: 'gemini',     emoji: '✨', label: 'Gemini',       hint: 'Extraction sémantique IA (~0.0003$/page)' },
              ] as const).map((c) => (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => setCleaner(c.val)}
                  className={`rounded-lg p-2 text-left text-xs transition ring-1 ${
                    cleaner === c.val
                      ? 'bg-violet-700 ring-violet-400 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-zinc-900 ring-zinc-700 text-zinc-300 hover:ring-violet-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                  </div>
                  <div className={`mt-1 text-[10px] leading-tight ${cleaner === c.val ? 'text-violet-100' : 'text-zinc-400'}`}>
                    {c.hint}
                  </div>
                </button>
              ))}
            </div>
            {cleaner === 'gemini' && (
              <div className="mt-3">
                <Label>💡 Contexte (hint pour Gemini)</Label>
                <input
                  type="text"
                  value={cleanerHint}
                  onChange={(e) => setCleanerHint(e.target.value)}
                  placeholder="ex: site e-commerce de matériel photo / blog spirituel / témoignages LGBT+"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
                <Hint>Le hint aide Gemini à savoir quoi préserver vs virer.</Hint>
              </div>
            )}
            <p className="mt-2 text-xs text-violet-200">
              {cleaner === 'off' && '⚠️ Pas de nettoyage : chunks polluants (menus, breadcrumbs, filtres) qui dégradent le RAG.'}
              {cleaner === 'standard' && 'Cleaner standard : vire images-icônes, breadcrumbs courts et lignes répétées.'}
              {cleaner === 'aggressive' && '✓ Recommandé : vire tout ce qui ressemble à du chrome web. Garde le contenu narratif et les blocs produit/prix.'}
              {cleaner === 'gemini' && '✨ Max qualité : Gemini Flash Lite extrait sémantiquement le contenu utile (descriptions, prix, infos clés). Coût ~0.0003$/page.'}
            </p>
          </div>

          {politeMode && (
            <div className="mt-3 rounded-xl bg-emerald-950/40 p-4 ring-1 ring-emerald-800/60">
              <Label>
                ⏱️ Délai entre requêtes : <span className="font-mono text-emerald-300">{hostDelayMs} ms</span>
                {' '}({(hostDelayMs / 1000).toFixed(1)}s)
              </Label>
              <input type="range" min={500} max={10000} step={250} value={hostDelayMs} onChange={(e) => setHostDelayMs(Number(e.target.value))} className="w-full accent-emerald-500" />
              <div className="flex justify-between text-xs text-zinc-400">
                <span>500 ms (rapide)</span>
                <span>2 500 ms (équilibré)</span>
                <span>10 s (très discret)</span>
              </div>
              <p className="mt-2 text-xs text-emerald-300">
                Mode discret actif : 1 worker max par domaine, jitter aléatoire ±20 %, backoff exponentiel sur 429/503, respect du <code className="rounded bg-emerald-900/50 px-1 py-0.5 font-mono text-emerald-200">Crawl-delay</code> du robots.txt.
              </p>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={handleExplore}
              disabled={exploring || !url.trim()}
              className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-50"
            >
              {exploring ? '🔍 Exploration…' : '🔍 Explorer le site'}
            </button>
            {exploreError && <span className="self-center text-sm text-rose-600">⚠ {exploreError}</span>}
          </div>
        </Section>

        {/* ÉTAPE 2 — ARBRE */}
        {tree && (
          <Section
            step={2}
            title={`Arborescence découverte (${tree.totalPages} pages)`}
            subtitle={
              <>
                Source : <Badge color={tree.source === 'sitemap' ? 'green' : 'amber'}>{tree.source === 'sitemap' ? '✓ sitemap.xml' : '🔍 BFS interne'}</Badge>
                . Coche les pages à scraper (toutes pré-sélectionnées par défaut).
              </>
            }
          >
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <button onClick={() => setSelected(new Set(allUrls))} className="rounded-md bg-zinc-800 px-3 py-1 font-medium text-zinc-200 hover:bg-zinc-700">Tout cocher ({allUrls.length})</button>
              <button onClick={() => setSelected(new Set())} className="rounded-md bg-zinc-800 px-3 py-1 font-medium text-zinc-200 hover:bg-zinc-700">Tout décocher</button>
              <button onClick={() => setCollapsed(new Set(flatten(tree.root).filter((n) => n.children.length).map((n) => n.url)))} className="rounded-md bg-zinc-800 px-3 py-1 font-medium text-zinc-200 hover:bg-zinc-700">Replier tout</button>
              <button onClick={() => setCollapsed(new Set())} className="rounded-md bg-zinc-800 px-3 py-1 font-medium text-zinc-200 hover:bg-zinc-700">Déplier tout</button>
              <span className="ml-auto self-center text-zinc-300">
                <strong className="text-rose-400">{selected.size}</strong> / {allUrls.length} sélectionnées
              </span>
            </div>

            <div className="max-h-[400px] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs">
              <TreeView node={tree.root} selected={selected} collapsed={collapsed} onToggleSelect={toggleNode} onToggleCollapse={toggleCollapsed} />
            </div>

            {tree.warnings.length > 0 && (
              <details className="mt-3 text-xs text-zinc-400">
                <summary className="cursor-pointer text-zinc-300 hover:text-white">💬 {tree.warnings.length} avertissement(s) du crawler</summary>
                <ul className="mt-2 space-y-1 pl-4">
                  {tree.warnings.map((w, i) => <li key={i} className="text-zinc-400">• {w}</li>)}
                </ul>
              </details>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button onClick={handleScrape} disabled={selected.size === 0 || job?.status === 'running'} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-40">
                ⚡ Lancer le scraping ({selected.size} pages)
              </button>
              {scrapeError && <span className="text-sm text-rose-400">⚠ {scrapeError}</span>}
            </div>
          </Section>
        )}

        {/* ÉTAPE 3 — PROGRESSION LIVE */}
        {job && (
          <Section
            step={3}
            title="Progression en direct"
            subtitle={
              <>
                Job <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-200">{job.id}</code>
                {' · '}
                <Badge color={job.status === 'done' ? 'green' : job.status === 'error' ? 'red' : job.status === 'cancelled' ? 'amber' : 'blue'}>{job.status}</Badge>
              </>
            }
          >
            <ProgressHero job={job} />
            <ProgressStats job={job} />

            {job.results.some((r) => r.cleanRemovedPct !== undefined) && (
              <CleaningChart results={job.results} />
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>📜 Logs live</Label>
                <div className="h-64 overflow-auto rounded-lg border border-zinc-800 bg-black p-3 font-mono text-xs leading-relaxed text-zinc-100">
                  {job.logs.length === 0 ? (
                    <div className="text-zinc-500">En attente…</div>
                  ) : job.logs.slice(-200).map((l, i) => (
                    <div key={`${l.ts}-${i}`} className={l.level === 'error' ? 'text-rose-400' : l.level === 'warn' ? 'text-amber-300' : 'text-zinc-200'}>
                      <span className="text-zinc-500">{new Date(l.ts).toLocaleTimeString()}</span>{' '}{l.msg}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>✅ Résultats récents (brut → nettoyé)</Label>
                <div className="h-64 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-zinc-900 text-zinc-300">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold">URL</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Brut</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Net</th>
                        <th className="px-2 py-1.5 text-right font-semibold">−%</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Chunks</th>
                        <th className="px-2 py-1.5 text-right font-semibold">⏱</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {job.results.length === 0 ? (
                        <tr><td colSpan={6} className="p-4 text-center text-zinc-500">Aucun résultat encore</td></tr>
                      ) : job.results.slice().reverse().map((r) => (
                        <tr key={r.url} className={r.ok ? '' : 'bg-rose-950/30'}>
                          <td className="px-2 py-1 font-mono max-w-[180px]">
                            <span className={r.ok ? 'text-emerald-400' : 'text-rose-400'}>{r.ok ? '✓' : '✗'}</span>{' '}
                            <span className="text-zinc-200 truncate inline-block max-w-[150px] align-bottom" title={r.url}>{shortPath(r.url)}</span>
                            {r.error && <div className="text-[10px] text-rose-300">{r.error}</div>}
                          </td>
                          <td className="px-2 py-1 text-right text-zinc-500">{fmtBytes(r.bytesRaw)}</td>
                          <td className="px-2 py-1 text-right text-zinc-100 font-mono">{fmtBytes(r.bytes)}</td>
                          <td className="px-2 py-1 text-right">
                            {r.cleanRemovedPct !== undefined ? (
                              <span className={`font-mono ${r.cleanRemovedPct >= 90 ? 'text-emerald-400' : r.cleanRemovedPct >= 70 ? 'text-sky-400' : r.cleanRemovedPct >= 30 ? 'text-amber-400' : 'text-zinc-500'}`}>
                                {r.cleanRemovedPct}%
                              </span>
                            ) : <span className="text-zinc-600">—</span>}
                          </td>
                          <td className="px-2 py-1 text-right font-mono text-violet-300">{r.chunkCount ?? (r.ingested === false ? '—' : '·')}</td>
                          <td className="px-2 py-1 text-right text-zinc-500 font-mono text-[10px]">{fmtDuration(r.durationMs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {job.status === 'running' && (
              <div className="mt-4">
                <button onClick={handleCancel} className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-400">⏸ Annuler le job</button>
              </div>
            )}

            {job.status === 'done' && (
              <div className="mt-4 rounded-lg bg-emerald-950/40 p-4 text-sm text-emerald-200 ring-1 ring-emerald-800/60">
                ✓ Terminé. {job.results.filter((r) => r.ingested).length} document(s) ingéré(s){importToLeads ? `, contacts importés en Leads` : ''}.
              </div>
            )}
          </Section>
        )}

        {/* Jobs passés */}
        {pastJobs.length > 0 && (
          <Section step={4} title="Jobs passés" subtitle="Historique des scrapes pour ce tenant.">
            <div className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-950">
              <table className="w-full text-xs">
                <thead className="bg-zinc-900 text-zinc-300">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Source</th>
                    <th className="px-2 py-1.5 text-left">Status</th>
                    <th className="px-2 py-1.5 text-right">Leads</th>
                    <th className="px-2 py-1.5 text-right">Erreurs</th>
                    <th className="px-2 py-1.5 text-right">Démarré</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {pastJobs.slice(0, 20).map((j) => (
                    <tr key={j.id} className="hover:bg-zinc-800/30">
                      <td className="px-2 py-1.5 truncate max-w-[280px] font-mono text-zinc-300" title={j.sourceUrl}>{j.sourceUrl}</td>
                      <td className="px-2 py-1.5">
                        <Badge color={j.status === 'done' ? 'green' : j.status === 'error' ? 'red' : j.status === 'cancelled' ? 'amber' : 'blue'}>{j.status}</Badge>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-emerald-300">{j.leadCount || 0}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-rose-300">{j.errorCount || 0}</td>
                      <td className="px-2 py-1.5 text-right text-zinc-400 text-[10px]">{j.startedAt ? new Date(j.startedAt).toLocaleString('fr-FR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

/* ─── COMPOSANTS PRIMITIVES ────────────────────────────────────── */

function ProgressHero({ job }: { job: any }) {
  const elapsed = job.startedAt ? (job.finishedAt || Date.now()) - job.startedAt : 0;
  const ratePerSec = job.done > 0 && elapsed > 0 ? job.done / (elapsed / 1000) : 0;
  const remaining = job.total - job.done;
  const etaSec = ratePerSec > 0 ? remaining / ratePerSec : 0;

  return (
    <div className="mb-4 rounded-xl bg-zinc-950 p-4 ring-1 ring-zinc-800">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-zinc-100">
          <strong className="font-mono text-base text-rose-400">{job.done}</strong>
          <span className="text-zinc-500"> / </span>
          <span className="font-mono">{job.total}</span> pages
          {job.errors > 0 && <span className="ml-2 rounded bg-rose-950/50 px-1.5 py-0.5 text-[10px] text-rose-300 ring-1 ring-rose-700/40">{job.errors} erreur(s)</span>}
        </span>
        <div className="flex items-center gap-3 text-xs">
          {job.status === 'running' && etaSec > 0 && etaSec < 9_000 && (
            <span className="text-zinc-400">ETA <strong className="font-mono text-zinc-200">~{fmtDuration(etaSec * 1000)}</strong></span>
          )}
          <span className="font-mono text-2xl font-bold text-zinc-100">{job.progress}%</span>
        </div>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full transition-all duration-500 ${
            job.status === 'done' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
              : job.status === 'error' ? 'bg-rose-500'
              : job.status === 'cancelled' ? 'bg-amber-500'
              : 'animate-pulse bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500'
          }`}
          style={{ width: `${job.progress}%` }}
        />
      </div>
      {job.currentUrl && (
        <div className="mt-2 flex items-center gap-2 truncate text-xs">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
          <span className="font-mono text-zinc-400">↓</span>
          <span className="truncate font-mono text-zinc-300" title={job.currentUrl}>{job.currentUrl}</span>
        </div>
      )}
    </div>
  );
}

function ProgressStats({ job }: { job: any }) {
  const allResults = (job.results || []) as JobResult[];
  const okResults = allResults.filter((r) => r.ok);
  const koResults = allResults.filter((r) => !r.ok);
  const totalRaw = okResults.reduce((s, r) => s + (r.bytesRaw || 0), 0);
  const totalNet = okResults.reduce((s, r) => s + (r.bytes || 0), 0);
  const totalChunks = okResults.reduce((s, r) => s + (r.chunkCount || 0), 0);
  const cleaningResults = okResults.filter((r) => r.cleanRemovedPct !== undefined);
  const avgRemoved = cleaningResults.length > 0
    ? Math.round(cleaningResults.reduce((s, r) => s + (r.cleanRemovedPct || 0), 0) / cleaningResults.length)
    : 0;

  const elapsed = job.startedAt ? (job.finishedAt || Date.now()) - job.startedAt : 0;
  const pagesPerMin = elapsed > 0 ? Math.round((job.done / (elapsed / 60_000)) * 10) / 10 : 0;
  const avgDuration = okResults.length > 0 ? Math.round(okResults.reduce((s, r) => s + (r.durationMs || 0), 0) / okResults.length) : 0;
  const total = allResults.length;
  const okPct = total > 0 ? Math.round((okResults.length / total) * 100) : 0;

  return (
    <div className="mb-4 grid gap-3 grid-cols-2 md:grid-cols-5">
      <StatCard icon="✅" label="OK / KO" value={`${okResults.length} / ${koResults.length}`} sub={total > 0 ? `${okPct}% succès` : 'aucune page'} color={koResults.length === 0 ? 'emerald' : okPct >= 80 ? 'sky' : 'amber'} />
      <StatCard icon="🌐" label="Octets bruts" value={fmtBytes(totalRaw)} sub="avant cleaner" color="zinc" />
      <StatCard icon="✨" label="Octets nettoyés" value={fmtBytes(totalNet)} sub={avgRemoved > 0 ? `−${avgRemoved}% en moyenne` : 'cleaner off'} color={avgRemoved >= 80 ? 'emerald' : avgRemoved >= 50 ? 'sky' : 'amber'} />
      <StatCard icon="🧩" label="Chunks ingérés" value={totalChunks} sub={`${okResults.length} doc(s)`} color="violet" />
      <StatCard icon="⚡" label="Vitesse" value={pagesPerMin > 0 ? `${pagesPerMin}/min` : '—'} sub={avgDuration > 0 ? `~${fmtDuration(avgDuration)}/page` : 'démarrage…'} color="rose" />
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: React.ReactNode; sub?: string;
  color: 'zinc' | 'emerald' | 'sky' | 'amber' | 'violet' | 'rose';
}) {
  const colorMap = {
    zinc:    { bg: 'bg-zinc-900',          text: 'text-zinc-200',    border: 'ring-zinc-700' },
    emerald: { bg: 'bg-emerald-950/60',    text: 'text-emerald-300', border: 'ring-emerald-700/50' },
    sky:     { bg: 'bg-sky-950/60',        text: 'text-sky-300',     border: 'ring-sky-700/50' },
    amber:   { bg: 'bg-amber-950/60',      text: 'text-amber-300',   border: 'ring-amber-700/50' },
    violet:  { bg: 'bg-violet-950/60',     text: 'text-violet-300',  border: 'ring-violet-700/50' },
    rose:    { bg: 'bg-rose-950/60',       text: 'text-rose-300',    border: 'ring-rose-700/50' },
  }[color];
  return (
    <div className={`rounded-xl ${colorMap.bg} p-3 ring-1 ${colorMap.border}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className={`mt-1 font-mono text-lg font-bold ${colorMap.text}`}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-500">{sub}</div>}
    </div>
  );
}

function CleaningChart({ results }: { results: JobResult[] }) {
  const slice = results.slice(-30);
  const maxRaw = Math.max(...slice.map((r) => r.bytesRaw || 0), 1);

  return (
    <div className="mb-4 rounded-xl bg-zinc-950 p-4 ring-1 ring-zinc-800">
      <div className="mb-2 flex items-center justify-between">
        <Label>📊 Efficacité du cleaner (30 dernières pages)</Label>
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1"><span className="h-2 w-3 bg-zinc-600" />Brut</span>
          <span className="flex items-center gap-1"><span className="h-2 w-3 bg-emerald-400" />Net</span>
        </div>
      </div>
      <div className="space-y-1">
        {slice.map((r, i) => {
          const rawPct = ((r.bytesRaw || 0) / maxRaw) * 100;
          const netPct = ((r.bytes || 0) / maxRaw) * 100;
          return (
            <div key={`${r.url}-${i}`} className="flex items-center gap-2 text-[10px]">
              <span className="w-32 truncate font-mono text-zinc-500" title={r.url}>{shortPath(r.url)}</span>
              <div className="relative h-3 flex-1 overflow-hidden rounded bg-zinc-900">
                <div className="absolute h-full bg-zinc-700/60" style={{ width: `${rawPct}%` }} />
                <div className="absolute h-full bg-gradient-to-r from-emerald-500 to-emerald-300" style={{ width: `${netPct}%` }} />
              </div>
              <span className={`w-12 text-right font-mono ${
                (r.cleanRemovedPct || 0) >= 90 ? 'text-emerald-400' :
                (r.cleanRemovedPct || 0) >= 70 ? 'text-sky-400' :
                'text-amber-400'
              }`}>−{r.cleanRemovedPct ?? 0}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Section({ step, title, subtitle, children }: { step: number; title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl bg-zinc-900 p-6 shadow-lg ring-1 ring-zinc-800">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white shadow-lg shadow-rose-600/30">{step}</span>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-200">{children}</label>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-zinc-400">{children}</p>;
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 ring-1 transition ${value ? 'bg-rose-950/30 ring-rose-700/50 hover:ring-rose-500' : 'bg-zinc-950 ring-zinc-700 hover:ring-zinc-500'}`}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-rose-500" />
      <div className="flex-1">
        <div className="text-sm font-medium text-zinc-100">{label}</div>
        {hint && <div className="text-xs text-zinc-400">{hint}</div>}
      </div>
    </label>
  );
}

function Badge({ color, children }: { color: 'green' | 'red' | 'amber' | 'blue'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-emerald-900/50 text-emerald-200 ring-1 ring-emerald-700/60',
    red: 'bg-rose-900/50 text-rose-200 ring-1 ring-rose-700/60',
    amber: 'bg-amber-900/50 text-amber-200 ring-1 ring-amber-700/60',
    blue: 'bg-sky-900/50 text-sky-200 ring-1 ring-sky-700/60',
  }[color];
  return <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{children}</span>;
}

function TreeView({ node, selected, collapsed, onToggleSelect, onToggleCollapse }: {
  node: CrawlNode;
  selected: Set<string>;
  collapsed: Set<string>;
  onToggleSelect: (n: CrawlNode, v: boolean) => void;
  onToggleCollapse: (url: string) => void;
}) {
  const isChecked = selected.has(node.url);
  const isCollapsed = collapsed.has(node.url);
  const allChildrenSelected = node.children.length > 0 && node.children.every((c) => selected.has(c.url));
  const partial = node.children.length > 0 && !isChecked && node.children.some((c) => selected.has(c.url));

  return (
    <div>
      <div className="flex items-center gap-1.5 py-0.5 hover:bg-zinc-900">
        {node.children.length > 0 ? (
          <button onClick={() => onToggleCollapse(node.url)} className="flex h-4 w-4 items-center justify-center text-zinc-400 hover:text-rose-400" aria-label={isCollapsed ? 'Déplier' : 'Replier'}>
            {isCollapsed ? '▶' : '▼'}
          </button>
        ) : (
          <span className="w-4 text-center text-zinc-600">·</span>
        )}
        <input
          type="checkbox"
          checked={isChecked}
          ref={(el) => { if (el) el.indeterminate = !isChecked && partial; }}
          onChange={(e) => onToggleSelect(node, e.target.checked || allChildrenSelected ? e.target.checked : true)}
          className="h-3.5 w-3.5 accent-rose-500"
        />
        <span className="truncate" title={node.url}>
          <span className="text-zinc-100">{shortPath(node.url)}</span>
          {node.title && <span className="ml-2 text-zinc-400">— {node.title}</span>}
        </span>
        {node.children.length > 0 && <span className="ml-auto text-[10px] text-zinc-500">{node.children.length} enfants</span>}
      </div>
      {!isCollapsed && node.children.length > 0 && (
        <div className="ml-5 border-l border-zinc-800 pl-2">
          {node.children.map((c) => (
            <TreeView key={c.url} node={c} selected={selected} collapsed={collapsed} onToggleSelect={onToggleSelect} onToggleCollapse={onToggleCollapse} />
          ))}
        </div>
      )}
    </div>
  );
}
