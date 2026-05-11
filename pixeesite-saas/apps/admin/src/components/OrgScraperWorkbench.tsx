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
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors, gradients, radii, shadows } from '@/lib/design-tokens';

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

/* ─── STYLES ───────────────────────────────────────────────────── */

const sectionCard: React.CSSProperties = {
  background: colors.bgCard,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
  padding: 20,
  marginBottom: 16,
  boxShadow: shadows.sm,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 6,
  opacity: 0.85,
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.55,
  marginTop: 4,
};

const inputMono: React.CSSProperties = {
  ...input,
  fontFamily: 'JetBrains Mono, Menlo, monospace',
};

const stepBadge = (n: number): React.CSSProperties => ({
  width: 32,
  height: 32,
  background: gradients.brand,
  color: 'white',
  fontWeight: 800,
  fontSize: 14,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  boxShadow: '0 4px 12px rgba(217,70,239,0.4)',
});

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
    <SimpleOrgPage
      orgSlug={orgSlug}
      emoji="🕸️"
      title="Scraper leads & RAG"
      desc="Explore un site, choisis visuellement les pages, extrait contacts (emails, téléphones, social) + ingère dans le RAG tenant."
    >
      {/* ÉTAPE 1 — CONFIG */}
      <Section step={1} title="Source à scraper" subtitle="Quelle URL, jusqu'à quelle profondeur, et quels garde-fous appliquer.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          <div>
            <label style={labelStyle}>URL racine</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (pasted) { e.preventDefault(); setUrl(normalizeClientUrl(pasted)); }
              }}
              placeholder="exemple.com ou https://exemple.com"
              style={inputMono}
            />
            {url && url !== normalizeClientUrl(url) && (
              <div style={{ marginTop: 6, padding: '4px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', fontSize: 11, color: '#fbbf24' }}>
                → URL nettoyée : <code style={{ fontFamily: 'monospace' }}>{normalizeClientUrl(url)}</code>
              </div>
            )}
            <div style={hintStyle}>Le scraper part de cette URL et explore les liens internes.</div>
          </div>

          <div>
            <label style={labelStyle}>Profondeur max : <span style={{ color: colors.primary, fontFamily: 'monospace' }}>{maxDepth}</span></label>
            <input type="range" min={1} max={5} step={1} value={maxDepth} onChange={(e) => setMaxDepth(Number(e.target.value))} style={{ width: '100%', accentColor: colors.primary }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.55, marginTop: 2 }}>
              <span>1 (racine)</span><span>3 (recommandé)</span><span>5 (lourd)</span>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Pages max : <span style={{ color: colors.primary, fontFamily: 'monospace' }}>{maxPages}</span></label>
            <input type="range" min={5} max={500} step={5} value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value))} style={{ width: '100%', accentColor: colors.primary }} />
            <div style={hintStyle}>Plafond dur pour éviter de partir en vrille sur un gros site.</div>
          </div>

          <div>
            <label style={labelStyle}>Tags appliqués aux leads &amp; docs</label>
            <input
              type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
              placeholder="prospect, salon-mariage, b2b"
              style={input}
            />
            <div style={hintStyle}>Séparés par des virgules.</div>
          </div>

          <div>
            <label style={labelStyle}>Pays par défaut (téléphones)</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} style={input}>
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
            <label style={labelStyle}>Cible (target)</label>
            <select value={target} onChange={(e) => setTarget(e.target.value as any)} style={input}>
              <option value="b2b">B2B (entreprises, pros)</option>
              <option value="b2c">B2C (particuliers)</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 18, padding: 14, background: '#0a0a0f', borderRadius: radii.md, border: `1px solid ${colors.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
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
        <div style={{ marginTop: 14, padding: 14, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: radii.md }}>
          <label style={labelStyle}>🧹 Nettoyage du contenu (CRITIQUE pour la qualité RAG)</label>
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
            {([
              { val: 'off',        emoji: '🚫', label: 'Aucun',        hint: 'Markdown Jina brut (avec menus)' },
              { val: 'standard',   emoji: '🧽', label: 'Standard',     hint: 'Vire menus & images-icônes' },
              { val: 'aggressive', emoji: '🧹', label: 'Aggressive',   hint: 'Vire tout le chrome web' },
              { val: 'gemini',     emoji: '✨', label: 'Gemini',       hint: 'Extraction sémantique IA (~0.0003$/page)' },
            ] as const).map((c) => {
              const isActive = cleaner === c.val;
              return (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => setCleaner(c.val)}
                  style={{
                    background: isActive ? gradients.purple : colors.bgCard,
                    border: isActive ? '1px solid rgba(217,70,239,0.6)' : `1px solid ${colors.border}`,
                    borderRadius: radii.md,
                    padding: 10,
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: isActive ? 'white' : colors.text,
                    boxShadow: isActive ? '0 4px 12px rgba(139,92,246,0.4)' : 'none',
                    transition: 'transform .12s',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{c.emoji}</span><span>{c.label}</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10, lineHeight: 1.3, opacity: isActive ? 0.9 : 0.55 }}>{c.hint}</div>
                </button>
              );
            })}
          </div>
          {cleaner === 'gemini' && (
            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>💡 Contexte (hint pour Gemini)</label>
              <input
                type="text"
                value={cleanerHint}
                onChange={(e) => setCleanerHint(e.target.value)}
                placeholder="ex: site e-commerce / blog spirituel / témoignages LGBT+"
                style={input}
              />
              <div style={hintStyle}>Le hint aide Gemini à savoir quoi préserver vs virer.</div>
            </div>
          )}
          <p style={{ marginTop: 10, fontSize: 11, color: '#c4b5fd' }}>
            {cleaner === 'off' && '⚠️ Pas de nettoyage : chunks polluants (menus, breadcrumbs, filtres) qui dégradent le RAG.'}
            {cleaner === 'standard' && 'Cleaner standard : vire images-icônes, breadcrumbs courts et lignes répétées.'}
            {cleaner === 'aggressive' && '✓ Recommandé : vire tout ce qui ressemble à du chrome web. Garde le contenu narratif et les blocs produit/prix.'}
            {cleaner === 'gemini' && '✨ Max qualité : Gemini Flash Lite extrait sémantiquement le contenu utile. Coût ~0.0003$/page.'}
          </p>
        </div>

        {politeMode && (
          <div style={{ marginTop: 14, padding: 14, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: radii.md }}>
            <label style={labelStyle}>
              ⏱️ Délai entre requêtes : <span style={{ fontFamily: 'monospace', color: '#6ee7b7' }}>{hostDelayMs} ms</span>
              {' '}({(hostDelayMs / 1000).toFixed(1)}s)
            </label>
            <input type="range" min={500} max={10000} step={250} value={hostDelayMs} onChange={(e) => setHostDelayMs(Number(e.target.value))} style={{ width: '100%', accentColor: colors.success }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.55, marginTop: 2 }}>
              <span>500 ms (rapide)</span><span>2 500 ms (équilibré)</span><span>10 s (très discret)</span>
            </div>
            <p style={{ marginTop: 8, fontSize: 11, color: '#6ee7b7' }}>
              Mode discret actif : 1 worker max par domaine, jitter ±20 %, backoff exponentiel sur 429/503, respect du <code style={{ fontFamily: 'monospace', background: 'rgba(16,185,129,0.15)', padding: '1px 4px', borderRadius: 3 }}>Crawl-delay</code> du robots.txt.
            </p>
          </div>
        )}

        <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleExplore}
            disabled={exploring || !url.trim()}
            style={{ ...btnPrimary, opacity: (exploring || !url.trim()) ? 0.5 : 1, cursor: (exploring || !url.trim()) ? 'not-allowed' : 'pointer' }}
          >
            {exploring ? '🔍 Exploration…' : '🔍 Explorer le site'}
          </button>
          {exploreError && <span style={{ fontSize: 12, color: colors.danger }}>⚠ {exploreError}</span>}
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
          <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11, alignItems: 'center' }}>
            <button onClick={() => setSelected(new Set(allUrls))} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 11 }}>Tout cocher ({allUrls.length})</button>
            <button onClick={() => setSelected(new Set())} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 11 }}>Tout décocher</button>
            <button onClick={() => setCollapsed(new Set(flatten(tree.root).filter((n) => n.children.length).map((n) => n.url)))} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 11 }}>Replier tout</button>
            <button onClick={() => setCollapsed(new Set())} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 11 }}>Déplier tout</button>
            <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.75 }}>
              <strong style={{ color: colors.primary }}>{selected.size}</strong> / {allUrls.length} sélectionnées
            </span>
          </div>

          <div style={{ maxHeight: 400, overflow: 'auto', border: `1px solid ${colors.border}`, borderRadius: radii.md, background: '#0a0a0f', padding: 12, fontFamily: 'JetBrains Mono, Menlo, monospace', fontSize: 12 }}>
            <TreeView node={tree.root} selected={selected} collapsed={collapsed} onToggleSelect={toggleNode} onToggleCollapse={toggleCollapsed} />
          </div>

          {tree.warnings.length > 0 && (
            <details style={{ marginTop: 12, fontSize: 11, opacity: 0.7 }}>
              <summary style={{ cursor: 'pointer', opacity: 0.8 }}>💬 {tree.warnings.length} avertissement(s) du crawler</summary>
              <ul style={{ marginTop: 6, paddingLeft: 18, listStyle: 'none' }}>
                {tree.warnings.map((w, i) => <li key={i} style={{ marginBottom: 3 }}>• {w}</li>)}
              </ul>
            </details>
          )}

          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleScrape}
              disabled={selected.size === 0 || job?.status === 'running'}
              style={{
                ...btnPrimary,
                background: gradients.green,
                boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
                opacity: (selected.size === 0 || job?.status === 'running') ? 0.4 : 1,
                cursor: (selected.size === 0 || job?.status === 'running') ? 'not-allowed' : 'pointer',
              }}
            >
              ⚡ Lancer le scraping ({selected.size} pages)
            </button>
            {scrapeError && <span style={{ fontSize: 12, color: colors.danger }}>⚠ {scrapeError}</span>}
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
              Job <code style={{ background: '#0a0a0f', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>{job.id}</code>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            <div>
              <label style={labelStyle}>📜 Logs live</label>
              <div style={{ height: 256, overflow: 'auto', border: `1px solid ${colors.border}`, borderRadius: radii.md, background: '#000', padding: 12, fontFamily: 'JetBrains Mono, Menlo, monospace', fontSize: 11, lineHeight: 1.55 }}>
                {job.logs.length === 0 ? (
                  <div style={{ opacity: 0.4 }}>En attente…</div>
                ) : job.logs.slice(-200).map((l, i) => (
                  <div key={`${l.ts}-${i}`} style={{ color: l.level === 'error' ? '#fca5a5' : l.level === 'warn' ? '#fcd34d' : '#e4e4e7' }}>
                    <span style={{ opacity: 0.4 }}>{new Date(l.ts).toLocaleTimeString()}</span>{' '}{l.msg}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>✅ Résultats récents (brut → nettoyé)</label>
              <div style={{ height: 256, overflow: 'auto', border: `1px solid ${colors.border}`, borderRadius: radii.md, background: '#0a0a0f' }}>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: colors.bgCard }}>
                    <tr>
                      <th style={thStyle}>URL</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Brut</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Net</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>−%</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Chunks</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>⏱</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.results.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', opacity: 0.5 }}>Aucun résultat encore</td></tr>
                    ) : job.results.slice().reverse().map((r) => (
                      <tr key={r.url} style={{ background: r.ok ? 'transparent' : 'rgba(239,68,68,0.08)', borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '4px 8px', fontFamily: 'monospace', maxWidth: 180 }}>
                          <span style={{ color: r.ok ? '#6ee7b7' : '#fca5a5' }}>{r.ok ? '✓' : '✗'}</span>{' '}
                          <span style={{ display: 'inline-block', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }} title={r.url}>{shortPath(r.url)}</span>
                          {r.error && <div style={{ fontSize: 9, color: '#fca5a5' }}>{r.error}</div>}
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', opacity: 0.5 }}>{fmtBytes(r.bytesRaw)}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtBytes(r.bytes)}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                          {r.cleanRemovedPct !== undefined ? (
                            <span style={{ fontFamily: 'monospace', color: r.cleanRemovedPct >= 90 ? '#6ee7b7' : r.cleanRemovedPct >= 70 ? '#7dd3fc' : r.cleanRemovedPct >= 30 ? '#fcd34d' : '#a1a1aa' }}>
                              {r.cleanRemovedPct}%
                            </span>
                          ) : <span style={{ opacity: 0.4 }}>—</span>}
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#c4b5fd' }}>{r.chunkCount ?? (r.ingested === false ? '—' : '·')}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', opacity: 0.5, fontFamily: 'monospace', fontSize: 10 }}>{fmtDuration(r.durationMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {job.status === 'running' && (
            <div style={{ marginTop: 14 }}>
              <button onClick={handleCancel} style={{ ...btnSecondary, background: colors.warning, color: '#1a1a1a', border: 'none', padding: '6px 14px', fontSize: 11 }}>⏸ Annuler le job</button>
            </div>
          )}

          {job.status === 'done' && (
            <div style={{ marginTop: 14, padding: 14, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: radii.md, fontSize: 12, color: '#6ee7b7' }}>
              ✓ Terminé. {job.results.filter((r) => r.ingested).length} document(s) ingéré(s){importToLeads ? `, contacts importés en Leads` : ''}.
            </div>
          )}
        </Section>
      )}

      {/* Jobs passés */}
      {pastJobs.length > 0 && (
        <Section step={4} title="Jobs passés" subtitle="Historique des scrapes pour ce tenant.">
          <div style={{ overflow: 'auto', border: `1px solid ${colors.border}`, borderRadius: radii.md, background: '#0a0a0f' }}>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead style={{ background: colors.bgCard }}>
                <tr>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Leads</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Erreurs</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Démarré</th>
                </tr>
              </thead>
              <tbody>
                {pastJobs.slice(0, 20).map((j) => (
                  <tr key={j.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '6px 10px', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', opacity: 0.85 }} title={j.sourceUrl}>{j.sourceUrl}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <Badge color={j.status === 'done' ? 'green' : j.status === 'error' ? 'red' : j.status === 'cancelled' ? 'amber' : 'blue'}>{j.status}</Badge>
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#6ee7b7' }}>{j.leadCount || 0}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#fca5a5' }}>{j.errorCount || 0}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', opacity: 0.55, fontSize: 10 }}>{j.startedAt ? new Date(j.startedAt).toLocaleString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </SimpleOrgPage>
  );
}

/* ─── COMPOSANTS PRIMITIVES ────────────────────────────────────── */

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  opacity: 0.7,
};

function ProgressHero({ job }: { job: any }) {
  const elapsed = job.startedAt ? (job.finishedAt || Date.now()) - job.startedAt : 0;
  const ratePerSec = job.done > 0 && elapsed > 0 ? job.done / (elapsed / 1000) : 0;
  const remaining = job.total - job.done;
  const etaSec = ratePerSec > 0 ? remaining / ratePerSec : 0;

  const barBackground = job.status === 'done' ? gradients.green
    : job.status === 'error' ? colors.danger
    : job.status === 'cancelled' ? colors.warning
    : gradients.brand;

  return (
    <div style={{ marginBottom: 14, padding: 14, background: '#0a0a0f', borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13 }}>
          <strong style={{ fontFamily: 'monospace', fontSize: 16, color: colors.primary }}>{job.done}</strong>
          <span style={{ opacity: 0.5 }}> / </span>
          <span style={{ fontFamily: 'monospace' }}>{job.total}</span> pages
          {job.errors > 0 && <span style={{ marginLeft: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', fontSize: 10 }}>{job.errors} erreur(s)</span>}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
          {job.status === 'running' && etaSec > 0 && etaSec < 9_000 && (
            <span style={{ opacity: 0.7 }}>ETA <strong style={{ fontFamily: 'monospace' }}>~{fmtDuration(etaSec * 1000)}</strong></span>
          )}
          <span style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 800 }}>{job.progress}%</span>
        </div>
      </div>
      <div style={{ position: 'relative', height: 12, overflow: 'hidden', borderRadius: 999, background: colors.border }}>
        <div
          style={{
            height: '100%',
            background: barBackground,
            width: `${job.progress}%`,
            transition: 'width 0.5s ease',
            animation: job.status === 'running' ? 'pulse 1.6s ease-in-out infinite' : undefined,
          }}
        />
      </div>
      {job.currentUrl && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: 'monospace', overflow: 'hidden' }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: colors.primary }} />
          <span style={{ opacity: 0.55 }}>↓</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.85 }} title={job.currentUrl}>{job.currentUrl}</span>
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
    <div style={{ marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
      <StatCard icon="✅" label="OK / KO" value={`${okResults.length} / ${koResults.length}`} sub={total > 0 ? `${okPct}% succès` : 'aucune page'} gradient={koResults.length === 0 ? gradients.green : okPct >= 80 ? gradients.blue : gradients.orange} />
      <StatCard icon="🌐" label="Octets bruts" value={fmtBytes(totalRaw)} sub="avant cleaner" gradient="linear-gradient(135deg, #3f3f46, #52525b)" />
      <StatCard icon="✨" label="Octets nettoyés" value={fmtBytes(totalNet)} sub={avgRemoved > 0 ? `−${avgRemoved}% en moyenne` : 'cleaner off'} gradient={avgRemoved >= 80 ? gradients.green : avgRemoved >= 50 ? gradients.blue : gradients.orange} />
      <StatCard icon="🧩" label="Chunks ingérés" value={String(totalChunks)} sub={`${okResults.length} doc(s)`} gradient={gradients.purple} />
      <StatCard icon="⚡" label="Vitesse" value={pagesPerMin > 0 ? `${pagesPerMin}/min` : '—'} sub={avgDuration > 0 ? `~${fmtDuration(avgDuration)}/page` : 'démarrage…'} gradient={gradients.pink} />
    </div>
  );
}

function StatCard({ icon, label, value, sub, gradient }: {
  icon: string; label: string; value: React.ReactNode; sub?: string; gradient: string;
}) {
  return (
    <div style={{ background: gradient, borderRadius: radii.md, padding: 12, color: 'white', boxShadow: shadows.sm }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.95 }}>
        <span>{icon}</span><span>{label}</span>
      </div>
      <div style={{ marginTop: 4, fontFamily: 'monospace', fontSize: 18, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function CleaningChart({ results }: { results: JobResult[] }) {
  const slice = results.slice(-30);
  const maxRaw = Math.max(...slice.map((r) => r.bytesRaw || 0), 1);

  return (
    <div style={{ marginBottom: 14, padding: 14, background: '#0a0a0f', borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={labelStyle}>📊 Efficacité du cleaner (30 dernières pages)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, opacity: 0.55 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 8, background: '#52525b', display: 'inline-block' }} />Brut</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 8, background: '#6ee7b7', display: 'inline-block' }} />Net</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {slice.map((r, i) => {
          const rawPct = ((r.bytesRaw || 0) / maxRaw) * 100;
          const netPct = ((r.bytes || 0) / maxRaw) * 100;
          const removedPct = r.cleanRemovedPct || 0;
          return (
            <div key={`${r.url}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
              <span style={{ width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', opacity: 0.55 }} title={r.url}>{shortPath(r.url)}</span>
              <div style={{ position: 'relative', height: 10, flex: 1, overflow: 'hidden', borderRadius: 3, background: '#0a0a0f' }}>
                <div style={{ position: 'absolute', height: '100%', background: 'rgba(82,82,91,0.6)', width: `${rawPct}%` }} />
                <div style={{ position: 'absolute', height: '100%', background: 'linear-gradient(90deg, #10b981, #6ee7b7)', width: `${netPct}%` }} />
              </div>
              <span style={{ width: 48, textAlign: 'right', fontFamily: 'monospace', color: removedPct >= 90 ? '#6ee7b7' : removedPct >= 70 ? '#7dd3fc' : '#fcd34d' }}>−{r.cleanRemovedPct ?? 0}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Section({ step, title, subtitle, children }: { step: number; title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={sectionCard}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <span style={stepBadge(step)}>{step}</span>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4, marginBottom: 0 }}>{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: 10,
        borderRadius: radii.md,
        border: value ? '1px solid rgba(217,70,239,0.4)' : `1px solid ${colors.border}`,
        background: value ? 'rgba(217,70,239,0.08)' : colors.bgCard,
        cursor: 'pointer',
        transition: 'border-color .15s, background .15s',
      }}
    >
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3, width: 14, height: 14, accentColor: colors.primary }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 10, opacity: 0.55, marginTop: 2 }}>{hint}</div>}
      </div>
    </label>
  );
}

function Badge({ color, children }: { color: 'green' | 'red' | 'amber' | 'blue'; children: React.ReactNode }) {
  const map = {
    green: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#6ee7b7' },
    red:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#fca5a5' },
    amber: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#fcd34d' },
    blue:  { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', text: '#7dd3fc' },
  }[color];
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, background: map.bg, border: `1px solid ${map.border}`, color: map.text }}>
      {children}
    </span>
  );
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
        {node.children.length > 0 ? (
          <button onClick={() => onToggleCollapse(node.url)} style={{ width: 16, height: 16, background: 'transparent', border: 0, color: colors.textMuted, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label={isCollapsed ? 'Déplier' : 'Replier'}>
            {isCollapsed ? '▶' : '▼'}
          </button>
        ) : (
          <span style={{ width: 16, textAlign: 'center', opacity: 0.3 }}>·</span>
        )}
        <input
          type="checkbox"
          checked={isChecked}
          ref={(el) => { if (el) el.indeterminate = !isChecked && partial; }}
          onChange={(e) => onToggleSelect(node, e.target.checked || allChildrenSelected ? e.target.checked : true)}
          style={{ width: 14, height: 14, accentColor: colors.primary }}
        />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={node.url}>
          <span>{shortPath(node.url)}</span>
          {node.title && <span style={{ marginLeft: 8, opacity: 0.55 }}>— {node.title}</span>}
        </span>
        {node.children.length > 0 && <span style={{ fontSize: 9, opacity: 0.5 }}>{node.children.length} enfants</span>}
      </div>
      {!isCollapsed && node.children.length > 0 && (
        <div style={{ marginLeft: 20, paddingLeft: 8, borderLeft: `1px solid ${colors.border}` }}>
          {node.children.map((c) => (
            <TreeView key={c.url} node={c} selected={selected} collapsed={collapsed} onToggleSelect={onToggleSelect} onToggleCollapse={onToggleCollapse} />
          ))}
        </div>
      )}
    </div>
  );
}
