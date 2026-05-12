import { NextRequest, NextResponse } from 'next/server';
import { platformDb, getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orgs/[slug]/studio/mindmap?siteSlug=…
 * Renvoie { nodes, edges } pour Cytoscape — site → pages → blocs/sections.
 *
 * Node shape: { id, label, type: 'site'|'page'|'block', siteSlug?, pageSlug? }
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const siteSlug = req.nextUrl.searchParams.get('siteSlug') || '';
  if (!siteSlug) return NextResponse.json({ error: 'siteSlug required' }, { status: 400 });

  const orgId = auth.membership.org.id;
  const site = await platformDb.site.findUnique({
    where: { orgId_slug: { orgId, slug: siteSlug } },
  });
  if (!site) return NextResponse.json({ error: 'site-not-found' }, { status: 404 });

  const nodes: any[] = [];
  const edges: any[] = [];
  const rootId = `site-${site.id}`;
  nodes.push({ id: rootId, label: site.name, type: 'site' });

  try {
    const tenantDb = await getTenantPrisma(slug);
    const pages = await tenantDb.sitePage.findMany({
      where: { siteId: site.id },
      orderBy: { isHome: 'desc' },
    });
    for (const p of pages) {
      const pageId = `page-${p.id}`;
      nodes.push({
        id: pageId,
        label: (p.isHome ? '🏠 ' : '📄 ') + p.title,
        type: 'page',
        siteSlug, pageSlug: p.slug,
      });
      edges.push({ from: rootId, to: pageId });

      // Limiter à 8 blocs significatifs par page pour ne pas saturer
      if (Array.isArray(p.blocks)) {
        const significantBlocks = (p.blocks as any[])
          .filter((b: any) => b && b.type && !['spacer', 'separator'].includes(b.type))
          .slice(0, 8);
        significantBlocks.forEach((b: any, i: number) => {
          const bid = `block-${p.id}-${i}`;
          const label = blockLabel(b);
          nodes.push({ id: bid, label, type: 'block' });
          edges.push({ from: pageId, to: bid });
        });
      }
    }
  } catch (e: any) {
    // Pas de pages ? on renvoie juste le site
    return NextResponse.json({ nodes, edges, warning: 'no-tenant-pages: ' + e?.message });
  }

  return NextResponse.json({ nodes, edges, site: { id: site.id, name: site.name, slug: site.slug } });
}

function blockLabel(b: any): string {
  const t = b.type || '?';
  const d = b.data || {};
  const emoji: Record<string, string> = {
    'parallax-hero': '⛰', 'hero': '🎯', 'parallax-slider': '🎞',
    'text': '📝', 'image': '🖼', 'video': '🎬',
    'cta': '🔘', 'cta-banner': '📢', 'columns': '📋',
    'gallery': '🖼', 'team': '👥', 'feature-grid': '✨',
    'embed': '📺', 'spacer': '⬜',
  };
  const e = emoji[t] || '🧩';
  const txt = d.title || d.label || t;
  return `${e} ${String(txt).slice(0, 24)}`;
}
