/**
 * /api/orgs/[slug]/scraper-jobs/explore — explore l'arborescence d'un site.
 *
 * Stratégie :
 *  1. Tente sitemap.xml (et sitemap_index.xml) → arbre BFS depuis sitemap
 *  2. Fallback : BFS depuis URL racine via Jina/fetch + parse liens internes
 *
 * Body : { url, maxDepth, maxPages, respectRobots, includeSubdomains, followExternal, polite, hostDelayMs }
 * Retour : { root: CrawlNode, totalPages, rootUrl, source: 'sitemap'|'bfs', warnings[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type CrawlNode = {
  url: string;
  title?: string;
  depth: number;
  children: CrawlNode[];
  status: 'ok' | 'error' | 'skipped';
  reason?: string;
};

async function fetchPage(url: string, jinaKey: string | null): Promise<{ ok: boolean; text: string; error?: string }> {
  try {
    if (jinaKey) {
      const r = await fetch(`https://r.jina.ai/${url}`, {
        headers: { 'Authorization': `Bearer ${jinaKey}`, 'X-Return-Format': 'html' },
        signal: AbortSignal.timeout(20_000),
      });
      if (r.ok) return { ok: true, text: await r.text() };
    }
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PixeesiteBot/1.0)' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return { ok: false, text: '', error: `HTTP ${r.status}` };
    return { ok: true, text: await r.text() };
  } catch (e: any) {
    return { ok: false, text: '', error: e?.message || 'fetch' };
  }
}

function extractLinks(html: string, base: string): string[] {
  const out = new Set<string>();
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], base);
      u.hash = '';
      out.add(u.toString());
    } catch { /* skip */ }
  }
  return Array.from(out);
}

function extractTitle(html: string): string | undefined {
  const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  return m ? m[1].trim().slice(0, 120) : undefined;
}

function sameOrigin(a: string, b: string, includeSubdomains: boolean): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    if (includeSubdomains) {
      const da = ua.hostname.split('.').slice(-2).join('.');
      const db = ub.hostname.split('.').slice(-2).join('.');
      return da === db;
    }
    return ua.hostname === ub.hostname;
  } catch { return false; }
}

async function tryFetchSitemap(rootUrl: string): Promise<string[] | null> {
  try {
    const u = new URL(rootUrl);
    const candidates = [`${u.origin}/sitemap.xml`, `${u.origin}/sitemap_index.xml`, `${u.origin}/sitemap-index.xml`];
    for (const c of candidates) {
      try {
        const r = await fetch(c, { signal: AbortSignal.timeout(10_000) });
        if (!r.ok) continue;
        const text = await r.text();
        const urls = Array.from(new Set([...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())));
        if (urls.length > 0) return urls;
      } catch { /* try next */ }
    }
  } catch { /* invalid url */ }
  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const orgId = auth.membership.org.id;

  const body = await req.json().catch(() => ({}));
  const rootUrl = (body.url as string)?.trim();
  if (!rootUrl) return NextResponse.json({ error: 'url-required' }, { status: 400 });
  try { new URL(rootUrl); } catch { return NextResponse.json({ error: 'invalid-url' }, { status: 400 }); }

  const maxDepth = Math.min(5, Math.max(1, Number(body.maxDepth) || 2));
  const maxPages = Math.min(500, Math.max(1, Number(body.maxPages) || 50));
  const includeSubdomains = !!body.includeSubdomains;
  const followExternal = !!body.followExternal;
  const warnings: string[] = [];

  // 1. Tentative sitemap
  const sitemapUrls = await tryFetchSitemap(rootUrl);
  if (sitemapUrls && sitemapUrls.length > 0) {
    const filtered = sitemapUrls.filter((u) => followExternal || sameOrigin(rootUrl, u, includeSubdomains)).slice(0, maxPages);
    // Arbre plat (depth=1) depuis racine
    const root: CrawlNode = {
      url: rootUrl, depth: 0, status: 'ok',
      children: filtered.filter((u) => u !== rootUrl).map((u) => ({ url: u, depth: 1, children: [], status: 'ok' }))
    };
    return NextResponse.json({ root, totalPages: filtered.length + (filtered.includes(rootUrl) ? 0 : 1), rootUrl, source: 'sitemap', warnings });
  }

  // 2. BFS depuis racine
  warnings.push('Pas de sitemap.xml trouvé — fallback BFS via fetch.');
  const jinaKey = await getOrgSecret(orgId, 'JINA_KEY');

  const visited = new Set<string>();
  const nodesByUrl = new Map<string, CrawlNode>();
  const rootNode: CrawlNode = { url: rootUrl, depth: 0, status: 'ok', children: [] };
  nodesByUrl.set(rootUrl, rootNode);
  visited.add(rootUrl);

  const queue: { url: string; depth: number; parent: CrawlNode }[] = [{ url: rootUrl, depth: 0, parent: rootNode }];

  while (queue.length > 0 && visited.size < maxPages) {
    const { url, depth, parent } = queue.shift()!;
    const r = await fetchPage(url, jinaKey);
    const node = nodesByUrl.get(url)!;
    if (!r.ok) {
      node.status = 'error';
      node.reason = r.error;
      warnings.push(`${url}: ${r.error}`);
      if (warnings.length > 30) break;
      continue;
    }
    node.title = extractTitle(r.text);

    if (depth >= maxDepth) continue;

    const links = extractLinks(r.text, url)
      .filter((u) => !u.startsWith('javascript:') && !u.startsWith('mailto:') && !u.startsWith('tel:'))
      .filter((u) => followExternal || sameOrigin(rootUrl, u, includeSubdomains))
      .filter((u) => !visited.has(u));

    for (const child of links) {
      if (visited.size >= maxPages) break;
      visited.add(child);
      const cn: CrawlNode = { url: child, depth: depth + 1, status: 'ok', children: [] };
      nodesByUrl.set(child, cn);
      parent.children.push(cn);
      queue.push({ url: child, depth: depth + 1, parent: cn });
    }
  }

  return NextResponse.json({ root: rootNode, totalPages: visited.size, rootUrl, source: 'bfs', warnings: warnings.slice(0, 30) });
}
