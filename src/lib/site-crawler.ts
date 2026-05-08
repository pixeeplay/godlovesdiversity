/**
 * Crawler d'exploration de site pour le RAG.
 *
 * Objectif : à partir d'une URL racine, construire une arborescence des pages
 * du site jusqu'à une profondeur configurable, pour permettre à l'admin de
 * sélectionner visuellement quelles pages ingérer dans le RAG.
 *
 * Stratégie :
 *   1. Tente d'abord /sitemap.xml (et /sitemap_index.xml). Si trouvé : c'est la
 *      vérité absolue, on l'utilise.
 *   2. Sinon BFS sur les liens internes (<a href>) jusqu'à profondeur N.
 *   3. Respecte robots.txt si demandé (par défaut : oui).
 *
 * Retour : un arbre où chaque nœud = { url, title, depth, children[], status }.
 * L'arbre est construit en regroupant les URLs par chemin (/, /a, /a/b, /a/b/c).
 */

const FETCH_TIMEOUT_MS = 8_000;
const UA = 'GLD-Crawler/1.0 (+https://gld.pixeeplay.com)';

export type CrawlNode = {
  url: string;
  title?: string;
  depth: number;
  children: CrawlNode[];
  status: 'ok' | 'error' | 'skipped';
  reason?: string; // Pour skipped/error : "robots.txt", "external", "timeout", etc.
};

export type CrawlOptions = {
  /** Profondeur max (1 = racine seule, 2 = racine + ses liens, etc.). Défaut 2. */
  maxDepth?: number;
  /** Nombre max de pages à explorer (safeguard). Défaut 100. */
  maxPages?: number;
  /** Respecter robots.txt. Défaut true. */
  respectRobots?: boolean;
  /** Inclure les sous-domaines (m.example.com, blog.example.com, etc.). Défaut false. */
  includeSubdomains?: boolean;
  /** Suivre les liens externes (autres domaines). Défaut false. */
  followExternal?: boolean;
};

export type CrawlResult = {
  root: CrawlNode;
  totalPages: number;
  rootUrl: string;
  source: 'sitemap' | 'bfs';
  warnings: string[];
};

/* ─── HELPERS ──────────────────────────────────────────────────── */

/**
 * Normalise une URL en gérant les typos courants (doubles protocoles, ':' manquant).
 * Voir aussi jina-scraper.ts:normalizeUrl pour la même logique.
 */
function normalizeUrl(raw: string): string {
  let u = raw.trim();
  u = u.replace(/[​-‍﻿]/g, '');
  u = u.replace(/^(https?:\/\/)+/i, 'https://');
  u = u.replace(/^https?:\/\/(https?)(:?)\/\//i, (_m, _proto, hasColon) =>
    hasColon ? 'https://' : 'https://'
  );
  u = u.replace(/^(https?)\/\/(?!\/)/i, '$1://');
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  u = u.replace(/:\/{2,}/g, '://');
  try {
    const p = new URL(u);
    p.hash = '';
    ['fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'ref'].forEach((k) =>
      p.searchParams.delete(k)
    );
    let out = p.toString();
    if (out.endsWith('/') && p.pathname !== '/') out = out.slice(0, -1);
    return out;
  } catch {
    return u;
  }
}

function sameHost(a: string, b: string, includeSubdomains: boolean): boolean {
  try {
    const ha = new URL(a).hostname.replace(/^www\./, '');
    const hb = new URL(b).hostname.replace(/^www\./, '');
    if (includeSubdomains) {
      const ra = ha.split('.').slice(-2).join('.');
      const rb = hb.split('.').slice(-2).join('.');
      return ra === rb;
    }
    return ha === hb;
  } catch {
    return false;
  }
}

async function fetchText(url: string, accept = 'text/html,application/xhtml+xml,*/*'): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: accept, 'Accept-Language': 'fr,en;q=0.9' },
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

/* ─── ROBOTS.TXT ───────────────────────────────────────────────── */

type RobotsRules = { disallow: string[]; allow: string[] };

async function fetchRobots(rootUrl: string): Promise<RobotsRules | null> {
  try {
    const u = new URL(rootUrl);
    const txt = await fetchText(`${u.protocol}//${u.host}/robots.txt`, 'text/plain');
    if (!txt) return null;
    const rules: RobotsRules = { disallow: [], allow: [] };
    let scope: 'all' | 'us' | 'other' = 'other';
    for (const rawLine of txt.split('\n')) {
      const line = rawLine.split('#')[0].trim();
      if (!line) continue;
      const [field, ...rest] = line.split(':');
      const value = rest.join(':').trim();
      const f = field.toLowerCase().trim();
      if (f === 'user-agent') {
        scope = value === '*' ? 'all' : value.toLowerCase().includes('gld') ? 'us' : 'other';
      } else if (scope !== 'other') {
        if (f === 'disallow' && value) rules.disallow.push(value);
        else if (f === 'allow' && value) rules.allow.push(value);
      }
    }
    return rules;
  } catch {
    return null;
  }
}

function robotsAllows(robots: RobotsRules | null, url: string): boolean {
  if (!robots) return true;
  try {
    const path = new URL(url).pathname;
    // Allow plus spécifique > disallow
    const matchedAllow = robots.allow.find((p) => path.startsWith(p));
    const matchedDisallow = robots.disallow.find((p) => path.startsWith(p));
    if (matchedAllow && (!matchedDisallow || matchedAllow.length >= matchedDisallow.length)) return true;
    if (matchedDisallow) return false;
    return true;
  } catch {
    return true;
  }
}

/* ─── SITEMAP ──────────────────────────────────────────────────── */

async function fetchSitemap(rootUrl: string): Promise<string[] | null> {
  const u = new URL(rootUrl);
  const candidates = [
    `${u.protocol}//${u.host}/sitemap.xml`,
    `${u.protocol}//${u.host}/sitemap_index.xml`,
    `${u.protocol}//${u.host}/sitemap-index.xml`,
  ];
  for (const c of candidates) {
    const xml = await fetchText(c, 'application/xml,text/xml,*/*');
    if (!xml) continue;
    const urls = await parseSitemap(xml, u.host);
    if (urls.length > 0) return urls;
  }
  return null;
}

async function parseSitemap(xml: string, host: string): Promise<string[]> {
  // 1. Si sitemap-index : <sitemap><loc>...</loc></sitemap>
  const indexMatches = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>/g)];
  if (indexMatches.length > 0) {
    const all: string[] = [];
    for (const m of indexMatches.slice(0, 20)) {
      const sub = await fetchText(m[1], 'application/xml,*/*');
      if (sub) all.push(...(await parseSitemap(sub, host)));
    }
    return all;
  }
  // 2. Sitemap normal : <url><loc>...</loc></url>
  const urlMatches = [...xml.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>/g)];
  return urlMatches.map((m) => m[1].trim()).filter((u) => {
    try {
      return new URL(u).hostname.includes(host.replace(/^www\./, '').split('.').slice(-2).join('.'));
    } catch {
      return false;
    }
  });
}

/* ─── BFS HTML ─────────────────────────────────────────────────── */

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!m) return undefined;
  return m[1].replace(/\s+/g, ' ').trim().slice(0, 200);
}

function extractLinks(html: string, base: string): string[] {
  const links = new Set<string>();
  const re = /<a\s+[^>]*href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], base).toString();
      if (/^https?:/.test(abs)) links.add(normalizeUrl(abs));
    } catch { /* invalid href */ }
  }
  return [...links];
}

/* ─── ARBRE ────────────────────────────────────────────────────── */

/**
 * Convertit une liste plate d'URLs en arbre par chemin.
 * Ex: ['/', '/a', '/a/b', '/c'] → / { a { b }, c }
 */
function buildTreeFromUrls(rootUrl: string, urls: string[], titles: Map<string, string>): CrawlNode {
  const root: CrawlNode = {
    url: rootUrl,
    title: titles.get(rootUrl) || new URL(rootUrl).hostname,
    depth: 0,
    children: [],
    status: 'ok',
  };
  const nodeByUrl = new Map<string, CrawlNode>([[rootUrl, root]]);

  // Tri par profondeur de chemin pour parents avant enfants
  const sorted = [...urls].sort((a, b) => {
    try {
      return new URL(a).pathname.split('/').length - new URL(b).pathname.split('/').length;
    } catch { return 0; }
  });

  for (const u of sorted) {
    if (nodeByUrl.has(u)) continue;
    const node: CrawlNode = {
      url: u,
      title: titles.get(u),
      depth: 0,
      children: [],
      status: 'ok',
    };
    // Trouve le parent : URL ancêtre la plus proche
    const parent = findClosestAncestor(u, nodeByUrl);
    node.depth = parent.depth + 1;
    parent.children.push(node);
    nodeByUrl.set(u, node);
  }

  // Tri alphabétique des enfants à chaque niveau pour stabilité
  const sortChildren = (n: CrawlNode) => {
    n.children.sort((a, b) => a.url.localeCompare(b.url));
    n.children.forEach(sortChildren);
  };
  sortChildren(root);

  return root;
}

function findClosestAncestor(url: string, nodes: Map<string, CrawlNode>): CrawlNode {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    while (segments.length > 0) {
      segments.pop();
      const candidate = `${u.protocol}//${u.host}${segments.length ? '/' + segments.join('/') : ''}`;
      if (nodes.has(candidate)) return nodes.get(candidate)!;
      const candidateAlt = `${u.protocol}//${u.host}/${segments.join('/')}`;
      if (nodes.has(candidateAlt)) return nodes.get(candidateAlt)!;
    }
  } catch { /* fallthrough */ }
  // Fallback : racine
  return nodes.values().next().value!;
}

/* ─── API PUBLIQUE ─────────────────────────────────────────────── */

/**
 * Explore un site et retourne son arborescence.
 *
 * Étapes :
 *   1. Tente sitemap.xml (le plus rapide et fiable)
 *   2. Sinon BFS interne jusqu'à maxDepth
 *   3. Respecte robots.txt si demandé
 *
 * Le résultat est un arbre que l'UI peut afficher avec checkboxes pour permettre
 * à l'admin de sélectionner quelles pages scraper.
 */
export async function exploreSite(rootUrl: string, opts: CrawlOptions = {}): Promise<CrawlResult> {
  const root = normalizeUrl(rootUrl);
  const maxDepth = Math.max(1, Math.min(opts.maxDepth ?? 2, 5));
  const maxPages = Math.max(1, Math.min(opts.maxPages ?? 100, 500));
  const respectRobots = opts.respectRobots !== false;
  const warnings: string[] = [];

  // Robots
  let robots: RobotsRules | null = null;
  if (respectRobots) {
    robots = await fetchRobots(root);
    if (!robots) warnings.push('Aucun robots.txt trouvé (ou inaccessible) — toutes les URLs autorisées par défaut');
  }

  // 1. Sitemap
  const fromSitemap = await fetchSitemap(root);
  if (fromSitemap && fromSitemap.length > 0) {
    const filtered = fromSitemap
      .map(normalizeUrl)
      .filter((u) => sameHost(u, root, opts.includeSubdomains ?? false))
      .filter((u) => !respectRobots || robotsAllows(robots, u))
      .slice(0, maxPages);
    if (!filtered.includes(root)) filtered.unshift(root);
    const titles = new Map<string, string>();
    return {
      root: buildTreeFromUrls(root, filtered, titles),
      totalPages: filtered.length,
      rootUrl: root,
      source: 'sitemap',
      warnings: [...warnings, `Sitemap.xml trouvé : ${filtered.length} pages`],
    };
  }

  warnings.push('Pas de sitemap.xml — fallback BFS sur les liens internes');

  // 2. BFS
  const visited = new Map<string, { depth: number; title?: string }>();
  const queue: { url: string; depth: number }[] = [{ url: root, depth: 0 }];
  let pages = 0;

  while (queue.length > 0 && pages < maxPages) {
    const { url, depth } = queue.shift()!;
    if (visited.has(url)) continue;
    if (depth >= maxDepth) {
      visited.set(url, { depth });
      continue;
    }
    if (respectRobots && !robotsAllows(robots, url)) {
      warnings.push(`Bloqué par robots.txt : ${url}`);
      continue;
    }

    const html = await fetchText(url);
    pages++;
    const title = html ? extractTitle(html) : undefined;
    visited.set(url, { depth, title });

    if (!html) continue;

    const links = extractLinks(html, url)
      .filter((l) => sameHost(l, root, opts.includeSubdomains ?? false) || opts.followExternal)
      .filter((l) => !visited.has(l));

    for (const l of links) {
      if (queue.length + visited.size >= maxPages) break;
      queue.push({ url: l, depth: depth + 1 });
    }
  }

  const titles = new Map<string, string>();
  for (const [u, info] of visited) if (info.title) titles.set(u, info.title);

  if (warnings.length > 50) warnings.length = 50; // Cap

  return {
    root: buildTreeFromUrls(root, [...visited.keys()], titles),
    totalPages: visited.size,
    rootUrl: root,
    source: 'bfs',
    warnings: [...warnings, `BFS terminé : ${visited.size} pages explorées`],
  };
}

/**
 * Aplatit un arbre en liste d'URLs (utile côté UI pour récupérer toutes les URLs sélectionnées).
 */
export function flattenTree(node: CrawlNode): string[] {
  const out: string[] = [node.url];
  for (const c of node.children) out.push(...flattenTree(c));
  return out;
}
