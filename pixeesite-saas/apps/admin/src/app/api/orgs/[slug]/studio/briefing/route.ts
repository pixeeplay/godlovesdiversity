import { NextRequest, NextResponse } from 'next/server';
import { platformDb, getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/studio/briefing
 * body: { siteSlug }
 *
 * Génère un audit complet du site :
 *   - Scores estimés (SEO, A11y, Contenu, Design) sur 100
 *   - Strengths : points forts
 *   - Improvements : suggestions concrètes
 *   - SEO : checklist SEO
 *   - A11y : audit accessibilité
 *   - Summary : résumé exécutif
 *
 * PDF généré côté client via window.print() ou en option via lib pdfkit
 * (non requis pour ce livrable — on renvoie le JSON structuré, le PDF est rendu HTML→Print).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const siteSlug = (body.siteSlug as string || '').trim();
  if (!siteSlug) return NextResponse.json({ error: 'siteSlug required' }, { status: 400 });

  const orgId = auth.membership.org.id;
  let siteName = siteSlug, siteContent = '', metrics: any = {};
  try {
    const site = await platformDb.site.findUnique({
      where: { orgId_slug: { orgId, slug: siteSlug } },
    });
    if (!site) return NextResponse.json({ error: 'site-not-found' }, { status: 404 });
    siteName = site.name;
    const tenantDb = await getTenantPrisma(slug);
    const pages = await tenantDb.sitePage.findMany({
      where: { siteId: site.id, visible: true },
      orderBy: { isHome: 'desc' },
    });

    // Métriques objectives calculables
    let totalBlocks = 0, totalImages = 0, totalAlts = 0, totalWords = 0, ctas = 0, headings = 0;
    let pagesWithMeta = 0;
    for (const p of pages) {
      if (p.meta) pagesWithMeta++;
      const blocks = Array.isArray(p.blocks) ? (p.blocks as any[]) : [];
      totalBlocks += blocks.length;
      for (const b of blocks) {
        const d = b.data || {};
        if (b.type === 'cta' || b.type === 'cta-banner') ctas++;
        if (d.src) { totalImages++; if (d.alt) totalAlts++; }
        if (d.bgImage) { totalImages++; if (d.alt) totalAlts++; }
        if (d.title) headings++;
        if (d.html) totalWords += stripHtml(d.html).split(/\s+/).filter(Boolean).length;
        if (d.subtitle) totalWords += String(d.subtitle).split(/\s+/).length;
      }
    }
    metrics = {
      pageCount: pages.length,
      blockCount: totalBlocks,
      imageCount: totalImages,
      altCoverage: totalImages > 0 ? Math.round((totalAlts / totalImages) * 100) : 100,
      wordCount: totalWords,
      ctas, headings,
      pagesWithMeta,
      metaCoverage: pages.length > 0 ? Math.round((pagesWithMeta / pages.length) * 100) : 0,
    };

    siteContent = pages.slice(0, 15).map((p: any) => `## ${p.title}\n${extractText(p.blocks)}`).join('\n\n').slice(0, 10000);
    if (site.description) siteContent = `Description: ${site.description}\n\n${siteContent}`;
  } catch (e: any) {
    return NextResponse.json({ error: 'site-load-failed: ' + e?.message }, { status: 500 });
  }

  // ─── Calcul des scores de base ────────────────────
  const baseScores = {
    Contenu: Math.min(100, Math.max(0, Math.round((metrics.wordCount / 300) * 10 + (metrics.pageCount >= 3 ? 30 : metrics.pageCount * 10)))),
    SEO: Math.round((metrics.metaCoverage * 0.6) + (metrics.headings > 5 ? 25 : metrics.headings * 5) + (metrics.pageCount >= 5 ? 15 : 0)),
    A11y: metrics.altCoverage,
    Design: Math.min(100, 40 + metrics.blockCount * 3 + (metrics.ctas > 0 ? 20 : 0)),
  };

  // ─── Audit IA ────────────────────────────────────
  const sysPrompt = `Tu es un consultant senior web (SEO, accessibilité WCAG, contenu, UX). Tu produis un audit structuré du site fourni au format JSON STRICT (pas de markdown) :
{
  "strengths": ["point fort 1", "point fort 2", ...],
  "improvements": ["suggestion 1", "suggestion 2", ...],
  "seo": ["item 1", ...],
  "a11y": ["item 1", ...],
  "summary": "Résumé exécutif de 4–6 phrases."
}
Règles :
- 100% français
- 3 à 6 items par liste, phrases concrètes et actionnables
- Pas de jargon technique inutile, vocabulaire pro accessible
- Pas de bullshit marketing, sois factuel`;

  const ai = await aiCall({
    orgId, feature: 'text',
    prompt: `Site "${siteName}".\n\nMétriques objectives : ${JSON.stringify(metrics)}\n\nContenu :\n${siteContent}\n\nProduis le JSON d'audit maintenant.`,
    systemPrompt: sysPrompt,
    temperature: 0.4, maxTokens: 2500,
  });

  let parsed: any = {};
  if (ai.ok && ai.output) {
    try {
      const t = ai.output.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(t);
    } catch {
      const m = ai.output.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    }
  }

  await platformDb.aiUsage.create({
    data: { orgId, provider: ai.provider, model: ai.model, operation: 'briefing', success: ai.ok,
            promptTokens: ai.promptTokens || 0, outputTokens: ai.outputTokens || 0 },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    siteName,
    metrics,
    scores: baseScores,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Site en ligne et publié', `${metrics.pageCount} page(s)`, `${metrics.imageCount} image(s) intégrée(s)`],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ['Ajouter plus de contenu textuel', 'Améliorer la couverture des metas SEO'],
    seo: Array.isArray(parsed.seo) ? parsed.seo : [],
    a11y: Array.isArray(parsed.a11y) ? parsed.a11y : [],
    summary: parsed.summary || ai.output || 'Audit non disponible.',
    // pdfUrl: null  — génération PDF côté client via window.print pour rester léger
  });
}

function extractText(blocks: any): string {
  if (!Array.isArray(blocks)) return '';
  return (blocks as any[])
    .map((b: any) => {
      const d = b?.data || {};
      return [d.title, d.subtitle, d.html && stripHtml(d.html), d.text, d.label].filter(Boolean).join(' ');
    })
    .filter(Boolean).join('\n');
}

function stripHtml(s: string): string { return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
