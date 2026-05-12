import { NextRequest, NextResponse } from 'next/server';
import { platformDb, getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';
import { generateAiImage } from '@/lib/ai-image';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/studio/storyboard
 * body: { siteSlug, count? = 10 }
 *
 * Flow :
 *   1. Charge contenu site
 *   2. IA → JSON [{ title, bullets, imagePrompt }] de 8 à 12 slides
 *   3. Pour chaque slide, soit image existante du site, soit image AI ou Unsplash
 *   4. Renvoie { slides: [{ title, bullets, image }] }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const siteSlug = (body.siteSlug as string || '').trim();
  if (!siteSlug) return NextResponse.json({ error: 'siteSlug required' }, { status: 400 });
  const count = Math.max(6, Math.min(14, Number(body.count) || 10));

  const orgId = auth.membership.org.id;
  let siteContent = '', siteName = siteSlug;
  let existingImages: string[] = [];
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
      take: 15,
    });
    const parts: string[] = [];
    for (const p of pages) {
      parts.push(`## ${p.title}\n${extractText(p.blocks)}`);
      existingImages.push(...extractImages(p.blocks));
    }
    siteContent = parts.join('\n\n').slice(0, 10000);
    if (site.description) siteContent = `Description: ${site.description}\n\n${siteContent}`;
  } catch (e: any) {
    return NextResponse.json({ error: 'site-load-failed: ' + e?.message }, { status: 500 });
  }

  // ─── IA : génère le storyboard JSON ──────────────
  const sysPrompt = `Tu produis un storyboard de présentation depuis un site web. Sortie JSON strict (pas de markdown, pas de prose) :
{
  "slides": [
    { "title": "...", "bullets": ["...", "...", "..."], "imagePrompt": "description en anglais d'une image cinematic en lien" },
    ...
  ]
}
Règles :
- Exactement ${count} slides
- title : 4–8 mots en français, accrocheur
- bullets : 2 à 4 puces de 5–12 mots chacune, en français
- imagePrompt : 6–12 mots en anglais, style "cinematic photography, [sujet], soft light"
- Pas de doublons, progression narrative cohérente (intro → contenu → conclusion/CTA)`;
  const ai = await aiCall({
    orgId, feature: 'text',
    prompt: `Site : "${siteName}". Contenu :\n\n${siteContent}\n\nProduis le JSON storyboard maintenant.`,
    systemPrompt: sysPrompt,
    temperature: 0.7, maxTokens: 2500,
  });
  if (!ai.ok || !ai.output) {
    return NextResponse.json({ error: 'ai-failed: ' + (ai.error || 'no output') }, { status: 500 });
  }

  let parsed: any;
  try {
    const jsonText = ai.output.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    parsed = JSON.parse(jsonText);
  } catch {
    // Tentative de récupération : chercher le 1er { … } JSON valide
    const m = ai.output.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch {}
    }
  }
  if (!parsed?.slides || !Array.isArray(parsed.slides)) {
    return NextResponse.json({ error: 'invalid-ai-json', raw: ai.output.slice(0, 500) }, { status: 500 });
  }

  // ─── Pour chaque slide, attribuer une image ──────
  // Stratégie : 1) image existante du site cyclée, 2) AI génération si nécessaire
  const slides: any[] = [];
  for (let i = 0; i < parsed.slides.length; i++) {
    const s = parsed.slides[i];
    let image: string | null = null;
    if (existingImages[i]) {
      image = existingImages[i];
    } else if (s.imagePrompt) {
      try {
        const r = await generateAiImage({
          orgId, prompt: s.imagePrompt, size: 'landscape_16_9', seed: i + 1,
        });
        image = r.url;
      } catch {}
    }
    slides.push({
      title: s.title || `Slide ${i + 1}`,
      bullets: Array.isArray(s.bullets) ? s.bullets.slice(0, 4) : [],
      image,
    });
  }

  await platformDb.aiUsage.create({
    data: { orgId, provider: ai.provider, model: ai.model, operation: 'storyboard', success: true,
            promptTokens: ai.promptTokens || 0, outputTokens: ai.outputTokens || 0 },
  }).catch(() => {});

  return NextResponse.json({ ok: true, slides, siteName });
}

function extractText(blocks: any): string {
  if (!Array.isArray(blocks)) return '';
  return (blocks as any[])
    .map((b: any) => {
      const d = b?.data || {};
      return [d.title, d.subtitle, d.html && stripHtml(d.html), d.text, d.label].filter(Boolean).join(' ');
    })
    .filter(Boolean).join('\n').slice(0, 5000);
}

function extractImages(blocks: any): string[] {
  if (!Array.isArray(blocks)) return [];
  const out: string[] = [];
  for (const b of blocks as any[]) {
    const d = b?.data || {};
    if (d.src && /^https?:\/\//.test(d.src) && /\.(jpg|jpeg|png|webp|avif)/i.test(d.src)) out.push(d.src);
    if (d.bgImage && /^https?:\/\//.test(d.bgImage)) out.push(d.bgImage);
    if (Array.isArray(d.slides)) {
      for (const s of d.slides) if (s.image && /^https?:\/\//.test(s.image)) out.push(s.image);
    }
    if (Array.isArray(d.items)) {
      for (const it of d.items) if (it.src && /^https?:\/\//.test(it.src)) out.push(it.src);
    }
  }
  return out;
}

function stripHtml(s: string): string { return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
