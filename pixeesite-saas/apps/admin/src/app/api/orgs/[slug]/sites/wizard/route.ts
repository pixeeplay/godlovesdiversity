import { NextRequest, NextResponse } from 'next/server';
import { platformDb, getTenantPrisma, ensureTenantDb } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';
import { ensureTenantTables } from '@/lib/tenant-init';
import { generateAiImage, generateAiImageBatch, extractKeywords, generateLogoImage } from '@/lib/ai-image';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/orgs/[slug]/sites/wizard
 * Body: { templateId, name, brief, audience, tone, primaryColor, font, logoUrl, sections: [], heroBgKeyword? }
 *
 * Stream NDJSON : chaque ligne est { step, ok, detail, progress?, page? }
 *
 * Flow :
 *   1. Crée site + DB tenant
 *   2. Étape 4a — plan IA : décide quelles pages (6-9) + structure (10-14 sections / page) parmi 22 types
 *   3. Étape 4b — pour chaque section qui a besoin d'image → génère via Flux ou Unsplash (caché en Asset)
 *   4. Étape 4c — pour chaque section → génère JSON contenu typé selon le schéma
 *   5. Seed des modules selon features actives
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json();
  if (!b.name || !b.brief) return NextResponse.json({ error: 'name + brief required' }, { status: 400 });

  const encoder = new TextEncoder();
  const orgId = auth.membership.org.id;

  const stream = new ReadableStream({
    async start(ctrl) {
      const emit = (msg: any) => ctrl.enqueue(encoder.encode(JSON.stringify(msg) + '\n'));

      try {
        // 1. Récupère le template
        emit({ step: 'fetch-template', ok: true });
        const template = b.templateId ? await platformDb.template.findUnique({ where: { id: b.templateId } }) : null;
        const blocksSeed = (template?.blocksSeed as any) || { pages: [] };
        const features: string[] = Array.isArray(blocksSeed.features) ? blocksSeed.features : [];
        const seedData = blocksSeed.seedData || {};
        const palette = blocksSeed.palette || null;

        // 2. Update theme org : priorité au choix utilisateur, sinon palette du template
        const themePatch: any = {};
        if (b.primaryColor) themePatch.primaryColor = b.primaryColor;
        else if (palette?.primary) themePatch.primaryColor = palette.primary;
        if (b.font) themePatch.font = b.font;
        else if (palette?.fontHeading) themePatch.font = palette.fontHeading;
        if (b.logoUrl) themePatch.logoUrl = b.logoUrl;
        if (Object.keys(themePatch).length > 0) {
          emit({ step: 'apply-theme', ok: true, detail: `couleur=${themePatch.primaryColor || '?'} font=${themePatch.font || '?'}` });
          await platformDb.org.update({ where: { id: orgId }, data: themePatch }).catch(() => {});
        }

        // 2b. THEME COMPLET pour le Site (palette dérivée + fonts) — c'est ce qui sera lu par le render
        const siteTheme = buildSiteTheme({
          primaryColor: b.primaryColor || palette?.primary || null,
          font: b.font || null,
          palette,
        });
        emit({
          step: 'derive-theme', ok: true,
          detail: `palette=${siteTheme.primary}/${siteTheme.secondary}/${siteTheme.accent} font=${(siteTheme.fontHeading || '').split(',')[0]}`,
        });

        // 3. Crée le site (avec son theme complet)
        const slug = (b.name as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
        let finalSlug = slug;
        let counter = 2;
        while (await platformDb.site.findUnique({ where: { orgId_slug: { orgId, slug: finalSlug } } }).catch(() => null)) {
          finalSlug = `${slug}-${counter++}`;
          if (counter > 100) break;
        }
        const site = await platformDb.site.create({
          data: {
            orgId, slug: finalSlug, name: b.name, status: 'published', deployedAt: new Date(),
            templateId: b.templateId || null,
            theme: siteTheme as any,
          },
        });
        emit({ step: 'site-created', ok: true, detail: { id: site.id, slug: finalSlug }, progress: 6 });

        // Auto-provisionne la DB tenant
        try {
          const provRes = await ensureTenantDb(orgSlug);
          emit({ step: 'ensure-db', ok: true, detail: provRes.created ? `DB "${provRes.dbName}" créée` : `DB "${provRes.dbName}" prête`, progress: 8 });
        } catch (e: any) {
          emit({ step: 'ensure-db', ok: false, detail: `Provisioning DB échoué : ${e?.message?.slice(0, 200) || 'unknown'}` });
          ctrl.close();
          return;
        }

        const tenantDb = await getTenantPrisma(orgSlug).catch((e) => {
          emit({ step: 'tenant-db', ok: false, detail: `Connexion tenant échouée : ${e?.message?.slice(0, 200) || 'unknown'}` });
          return null;
        });
        if (!tenantDb) { ctrl.close(); return; }

        emit({ step: 'ensure-tables', ok: true, detail: 'Vérification/création des tables tenant…' });
        const tablesLog = await ensureTenantTables(tenantDb);
        const tablesOk = tablesLog.filter((t) => t.ok).length;
        const tablesKo = tablesLog.filter((t) => !t.ok);
        if (tablesKo.length > 0) {
          emit({ step: 'ensure-tables', ok: false, detail: `${tablesOk}/${tablesLog.length} OK — erreurs: ${tablesKo.map((t) => t.name).join(', ')}` });
        } else {
          emit({ step: 'ensure-tables', ok: true, detail: `${tablesOk}/${tablesLog.length} tables prêtes`, progress: 10 });
        }

        // ─────────────────────────────────────────────────────────────────
        // 4a. PLAN GLOBAL — l'IA décide quelles pages + structure de chaque
        // ─────────────────────────────────────────────────────────────────
        emit({ step: 'plan-structure', ok: true, detail: 'IA structure le site (pages + 10-14 sections / page)…', progress: 14 });

        const plan = await planWholeSite({
          orgId, brief: b.brief, audience: b.audience, tone: b.tone, features, templatePages: blocksSeed.pages || [],
        });
        const pagesPlanned = plan.pages;
        emit({
          step: 'plan-structure', ok: true,
          detail: `${pagesPlanned.length} pages planifiées (${pagesPlanned.reduce((acc, p) => acc + p.sections.length, 0)} sections totales)`,
          progress: 20,
        });

        // ─────────────────────────────────────────────────────────────────
        // 4b. LOGO IA (optionnel, si pas déjà fourni)
        // ─────────────────────────────────────────────────────────────────
        let generatedLogo: string | null = null;
        if (!b.logoUrl && !themePatch.logoUrl) {
          try {
            emit({ step: 'generate-logo', ok: true, detail: 'Génération logo IA…', progress: 22 });
            generatedLogo = await generateLogoImage(orgId, b.name, b.brief);
            if (generatedLogo) {
              await platformDb.org.update({ where: { id: orgId }, data: { logoUrl: generatedLogo } }).catch(() => {});
              emit({ step: 'generate-logo', ok: true, detail: 'Logo généré et appliqué', progress: 24 });
            }
          } catch { /* silent */ }
        }

        // ─────────────────────────────────────────────────────────────────
        // 4c. POUR CHAQUE PAGE → génère le contenu de chaque section
        // ─────────────────────────────────────────────────────────────────
        const knownPageSlugs = pagesPlanned.map((p) => p.slug);
        const totalPages = pagesPlanned.length;

        for (let i = 0; i < pagesPlanned.length; i++) {
          const p = pagesPlanned[i]!;
          emit({
            step: `generate-${p.slug}`, ok: true,
            detail: `Génération IA "${p.title}" (${p.sections.length} sections)…`,
            progress: 25 + (i / totalPages) * 65,
          });

          const generatedBlocks: any[] = [];
          for (let s = 0; s < p.sections.length; s++) {
            const sec = p.sections[s]!;
            const block = await generateSectionBlock({
              orgId, tenantDb,
              brief: b.brief, audience: b.audience, tone: b.tone,
              pageTitle: p.title, pageSlug: p.slug,
              sectionType: sec.type,
              hint: sec.hint || '',
              knownPageSlugs,
              isFirst: s === 0,
              indexOnPage: s,
            });
            if (block) generatedBlocks.push(block);
          }

          // Garantit ≥ 10 blocs : on complète avec spacer + cta variés
          while (generatedBlocks.length < 10) {
            const otherPage = knownPageSlugs.find((sl) => sl !== p.slug) || '/';
            generatedBlocks.push({
              type: 'cta', width: 'full',
              data: { title: 'Découvrir plus', subtitle: 'Explorez notre univers en quelques clics.', label: 'Voir la suite', href: otherPage },
            });
            if (generatedBlocks.length < 10) {
              generatedBlocks.push({ type: 'spacer', width: 'full', data: { height: 40 } });
            }
          }

          try {
            await (tenantDb as any).sitePage.create({
              data: {
                siteId: site.id,
                slug: p.slug || '/',
                title: p.title || 'Page',
                blocks: generatedBlocks,
                isHome: p.isHome || p.slug === '/',
                visible: true,
                meta: p.meta || null,
              },
            });
            emit({
              step: `page-${p.slug}`, ok: true,
              detail: `${generatedBlocks.length} blocs créés`,
              progress: 25 + ((i + 1) / totalPages) * 65,
              page: p.slug,
            });
          } catch (e: any) {
            emit({ step: `page-${p.slug}`, ok: false, detail: e?.message?.slice(0, 200) });
          }
        }

        // ─────────────────────────────────────────────────────────────────
        // 5. Sections optionnelles & seed modules (inchangé)
        // ─────────────────────────────────────────────────────────────────
        if (Array.isArray(b.sections)) {
          for (const section of b.sections) {
            emit({ step: `enable-${section}`, ok: true, detail: `Activation ${section}` });
          }
        }

        const slugify = (s: string) =>
          (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

        if (features.includes('shop') && Array.isArray(seedData.products) && seedData.products.length > 0) {
          emit({ step: 'seed-products', ok: true, detail: `Seed ${seedData.products.length} produit(s)…` });
          let createdProducts = 0;
          for (const p of seedData.products) {
            try {
              const productSlug = slugify(p.slug || p.name);
              await (tenantDb as any).product.upsert({
                where: { slug: productSlug },
                update: {},
                create: {
                  slug: productSlug, name: p.name || 'Produit',
                  description: p.description || null, priceCents: p.priceCents || 0, currency: p.currency || 'EUR',
                  images: p.images || [], inventory: p.inventory ?? 0, category: p.category || null, active: true,
                },
              });
              createdProducts++;
            } catch { /* continue */ }
          }
          emit({ step: 'seed-products', ok: true, detail: `${createdProducts}/${seedData.products.length} produits seedés` });
        }

        if ((features.includes('blog') || features.includes('articles')) && Array.isArray(seedData.articles) && seedData.articles.length > 0) {
          emit({ step: 'seed-articles', ok: true, detail: `Seed ${seedData.articles.length} article(s)…` });
          let createdArticles = 0;
          for (const a of seedData.articles) {
            try {
              const articleSlug = slugify(a.slug || a.title);
              await (tenantDb as any).article.upsert({
                where: { slug: articleSlug },
                update: {},
                create: {
                  slug: articleSlug, title: a.title || 'Article',
                  excerpt: a.excerpt || null, bodyHtml: a.bodyHtml || null,
                  coverImage: a.coverImage || null, tags: a.tags || [],
                  authorName: a.authorName || null, status: a.status || 'draft',
                  publishedAt: a.status === 'published' ? new Date() : null,
                },
              });
              createdArticles++;
            } catch { /* continue */ }
          }
          emit({ step: 'seed-articles', ok: true, detail: `${createdArticles}/${seedData.articles.length} articles seedés` });
        }

        if ((features.includes('events') || features.includes('agenda')) && Array.isArray(seedData.events) && seedData.events.length > 0) {
          emit({ step: 'seed-events', ok: true, detail: `Seed ${seedData.events.length} événement(s)…` });
          let createdEvents = 0;
          for (const ev of seedData.events) {
            try {
              const evSlug = slugify(ev.slug || ev.title);
              await (tenantDb as any).event.upsert({
                where: { slug: evSlug },
                update: {},
                create: {
                  slug: evSlug, title: ev.title || 'Événement',
                  description: ev.description || null, startsAt: ev.startsAt ? new Date(ev.startsAt) : new Date(),
                  endsAt: ev.endsAt ? new Date(ev.endsAt) : null, location: ev.location || null,
                  coverImage: ev.coverImage || null, category: ev.category || null, published: true,
                },
              });
              createdEvents++;
            } catch { /* continue */ }
          }
          emit({ step: 'seed-events', ok: true, detail: `${createdEvents}/${seedData.events.length} événements seedés` });
        }

        if (features.includes('testimonials') && Array.isArray(seedData.testimonials) && seedData.testimonials.length > 0) {
          emit({ step: 'seed-testimonials', ok: true, detail: `Seed ${seedData.testimonials.length} témoignage(s)…` });
          let createdTestimonials = 0;
          for (const t of seedData.testimonials) {
            try {
              await (tenantDb as any).testimonial.create({
                data: {
                  authorName: t.authorName || 'Client', authorTitle: t.authorTitle || null,
                  authorAvatar: t.authorAvatar || null, quote: t.quote || null,
                  rating: t.rating ?? null, featured: !!t.featured, published: true,
                },
              });
              createdTestimonials++;
            } catch { /* continue */ }
          }
          emit({ step: 'seed-testimonials', ok: true, detail: `${createdTestimonials}/${seedData.testimonials.length} témoignages seedés` });
        }

        if (features.includes('newsletter') && Array.isArray(seedData.newsletters) && seedData.newsletters.length > 0) {
          emit({ step: 'seed-newsletters', ok: true, detail: `Seed ${seedData.newsletters.length} newsletter(s)…` });
          let createdNl = 0;
          for (const n of seedData.newsletters) {
            try {
              await (tenantDb as any).newsletter.create({
                data: { subject: n.subject || 'Newsletter', bodyHtml: n.bodyHtml || null, status: n.status || 'draft' },
              });
              createdNl++;
            } catch { /* continue */ }
          }
          emit({ step: 'seed-newsletters', ok: true, detail: `${createdNl}/${seedData.newsletters.length} newsletters seedées` });
        }

        const pageCount = await (tenantDb as any).sitePage.count({ where: { siteId: site.id } }).catch(() => totalPages);
        await platformDb.site.update({ where: { id: site.id }, data: { pageCount } }).catch(() => {});

        emit({ step: 'done', ok: true, detail: `Site créé avec ${pageCount} pages`, progress: 100, siteSlug: finalSlug });
      } catch (e: any) {
        emit({ step: 'fatal', ok: false, detail: e?.message?.slice(0, 300) });
      }
      ctrl.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'X-Accel-Buffering': 'no' },
  });
}

// ═══════════════════════════════════════════════════════════════════
// PLAN GLOBAL — pages + sections de l'ensemble du site
// ═══════════════════════════════════════════════════════════════════

interface PlannedPage {
  slug: string;
  title: string;
  isHome?: boolean;
  meta?: any;
  sections: Array<{ type: string; hint?: string }>;
}

/**
 * Catalogue des pages candidates (l'IA choisit 6-9 parmi celles-ci selon le brief).
 */
const CANDIDATE_PAGES: Array<{ slug: string; title: string }> = [
  { slug: '/', title: 'Accueil' },
  { slug: '/about', title: 'À propos' },
  { slug: '/services', title: 'Services' },
  { slug: '/realisations', title: 'Réalisations' },
  { slug: '/temoignages', title: 'Témoignages' },
  { slug: '/blog', title: 'Blog' },
  { slug: '/tarifs', title: 'Tarifs' },
  { slug: '/contact', title: 'Contact' },
  { slug: '/faq', title: 'FAQ' },
];

const ALL_BLOCK_TYPES = [
  'parallax-hero', 'parallax-slider', 'text', 'image', 'video', 'columns', 'embed', 'spacer', 'cta', 'hero',
  'gallery', 'pricing', 'testimonials', 'faq', 'counters', 'team', 'services', 'timeline', 'marquee',
  'cta-banner', 'logo-cloud', 'feature-grid',
];

async function planWholeSite(opts: {
  orgId: string;
  brief: string;
  audience: string;
  tone: string;
  features: string[];
  templatePages: Array<{ slug: string; title: string; isHome?: boolean; meta?: any }>;
}): Promise<{ pages: PlannedPage[] }> {
  const { orgId, brief, audience, tone, features, templatePages } = opts;

  // Si le template a déjà défini une liste de pages, on s'en sert comme base ; sinon on laisse l'IA choisir
  const templateSlugs = templatePages.map((p) => p.slug);
  const candidateList = CANDIDATE_PAGES.map((p) => `"${p.slug}" (${p.title})`).join(', ');

  const prompt = `Tu es un architecte de sites web haut de gamme. Tu conçois un site complet à partir d'un brief.

Brief : "${brief}"
Audience : ${audience || 'large'}
Ton : ${tone || 'professionnel'}
Features actives : ${features.join(', ') || 'aucune'}
${templateSlugs.length > 0 ? `Pages déjà prévues par le template : ${templateSlugs.join(', ')}` : ''}

ÉTAPE 1 — Choisis 6 à 9 pages parmi cette liste, ADAPTÉES au brief :
${candidateList}
(Tu peux adapter le slug si le contexte le demande, ex : /menu pour un restaurant, /portfolio pour un artiste.)
Toujours inclure "/" (Accueil) et "/contact". Évite "/tarifs" si l'activité fonctionne sur devis.

ÉTAPE 2 — Pour CHAQUE page, propose 10 à 14 sections variées, MAXIMALEMENT DIVERSES (jamais 2x le même type d'affilée, et utilise au moins 6 types différents par page).

Types de section disponibles (22) :
- "parallax-hero" : hero immersif full-bleed (toujours 1ère section)
- "parallax-slider" : slider 3-5 visuels
- "text" : storytelling long-form (200-280 mots)
- "image" : visuel unique avec légende
- "video" : vidéo embed
- "columns" : 3-4 cards avec icône
- "embed" : carte ou iframe
- "spacer" : respiration entre 2 sections
- "cta" : call-to-action centré
- "hero" : hero simple (à utiliser rarement, préférer parallax-hero)
- "gallery" : grille filtrable d'images 6-12
- "pricing" : 3 cards de prix
- "testimonials" : carousel témoignages
- "faq" : accordion questions/réponses
- "counters" : chiffres clés animés
- "team" : grille équipe (3-6 membres)
- "services" : bento services premium
- "timeline" : parcours vertical étapes
- "marquee" : bandeau infini (citations ou logos)
- "cta-banner" : grand banner CTA gradient
- "logo-cloud" : wall de logos partenaires
- "feature-grid" : bento asymétrique avec icônes

CONTRAINTES :
- 1ère section TOUJOURS "parallax-hero"
- Dernière section : préférer "cta-banner" ou "cta"
- Chaque page doit avoir ENTRE 10 ET 14 sections
- Adapte les sections au sujet de la page (page /contact → embed map + faq + cta-banner ; page /tarifs → pricing + faq + testimonials ; page /realisations → gallery + counters + testimonials ; page /about → timeline + team + counters)
- Pas de mention religieuse
- Français, factuel, chaleureux

Retourne UNIQUEMENT ce JSON, rien d'autre :
{
  "pages": [
    {
      "slug": "/",
      "title": "Accueil",
      "isHome": true,
      "sections": [
        { "type": "parallax-hero", "hint": "<10-15 mots de description visuelle>" },
        { "type": "feature-grid", "hint": "3 piliers de l'offre" },
        ...
      ]
    },
    ...
  ]
}`;

  let parsed: any = null;
  try {
    const res = await aiCall({ orgId, feature: 'text', prompt, temperature: 0.75, maxTokens: 8000 });
    if (res.ok && res.output) {
      const m = res.output.match(/\{[\s\S]+\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* fall through */ }
      }
    }
  } catch { /* fall through */ }

  // Validation + fallback
  const pages: PlannedPage[] = [];
  if (parsed?.pages && Array.isArray(parsed.pages)) {
    for (const pp of parsed.pages) {
      if (!pp?.slug || !Array.isArray(pp?.sections)) continue;
      const cleanSections = pp.sections
        .filter((s: any) => s?.type && ALL_BLOCK_TYPES.includes(s.type))
        .map((s: any) => ({ type: s.type, hint: s.hint || '' }));
      if (cleanSections.length === 0) continue;
      // Garantit que la 1ère section est parallax-hero
      if (cleanSections[0]!.type !== 'parallax-hero') {
        cleanSections.unshift({ type: 'parallax-hero', hint: `Hero ${pp.title || pp.slug}` });
      }
      // Cap à 14
      const sliced = cleanSections.slice(0, 14);
      pages.push({
        slug: pp.slug,
        title: pp.title || pp.slug,
        isHome: !!pp.isHome || pp.slug === '/',
        meta: pp.meta || null,
        sections: sliced,
      });
    }
  }

  // Fallback : si l'IA n'a rien produit, on génère un set par défaut riche
  if (pages.length === 0) {
    for (const cp of CANDIDATE_PAGES.slice(0, 7)) {
      pages.push({
        slug: cp.slug, title: cp.title, isHome: cp.slug === '/',
        sections: DEFAULT_SECTIONS_FOR_PAGE(cp.slug),
      });
    }
  }

  // S'assure du minimum : home obligatoire
  if (!pages.find((p) => p.slug === '/')) {
    pages.unshift({ slug: '/', title: 'Accueil', isHome: true, sections: DEFAULT_SECTIONS_FOR_PAGE('/') });
  }
  // Si on a moins de 6 pages, ajoute des candidates manquantes
  for (const cp of CANDIDATE_PAGES) {
    if (pages.length >= 6) break;
    if (!pages.find((p) => p.slug === cp.slug)) {
      pages.push({ slug: cp.slug, title: cp.title, sections: DEFAULT_SECTIONS_FOR_PAGE(cp.slug) });
    }
  }
  // Cap à 9 pages max
  return { pages: pages.slice(0, 9) };
}

/** Sections par défaut riches (10-14) si IA fail. Variées par défaut. */
function DEFAULT_SECTIONS_FOR_PAGE(slug: string): Array<{ type: string; hint?: string }> {
  if (slug === '/' || slug === '/home') {
    return [
      { type: 'parallax-hero', hint: 'Hero principal immersif, accroche forte' },
      { type: 'logo-cloud', hint: 'Ils nous font confiance — 6 logos' },
      { type: 'feature-grid', hint: '3 piliers de l\'offre avec icônes' },
      { type: 'parallax-slider', hint: 'Galerie 4 visuels signature' },
      { type: 'counters', hint: '4 chiffres clés : années, clients, projets, taux satisfaction' },
      { type: 'services', hint: 'Bento : 2 services big + 4 small' },
      { type: 'testimonials', hint: '4 témoignages avec photo' },
      { type: 'timeline', hint: 'Notre approche en 4 étapes' },
      { type: 'gallery', hint: 'Aperçu réalisations 8 visuels' },
      { type: 'faq', hint: '5 questions fréquentes' },
      { type: 'cta-banner', hint: 'Grand CTA contact' },
    ];
  }
  if (slug.includes('about') || slug.includes('propos')) {
    return [
      { type: 'parallax-hero', hint: 'Hero "À propos"' },
      { type: 'text', hint: 'Histoire / origines (250 mots)' },
      { type: 'counters', hint: 'Notre parcours en chiffres' },
      { type: 'timeline', hint: '4-5 étapes clés depuis la création' },
      { type: 'image', hint: 'Photo équipe ou atelier en situation' },
      { type: 'feature-grid', hint: '3 valeurs fondatrices' },
      { type: 'team', hint: 'Présentation 3-4 membres' },
      { type: 'testimonials', hint: '3 témoignages d\'anciens clients' },
      { type: 'marquee', hint: 'Citations inspirantes en bandeau' },
      { type: 'cta-banner', hint: 'CTA rejoindre / contacter' },
    ];
  }
  if (slug.includes('services')) {
    return [
      { type: 'parallax-hero', hint: 'Hero "Services"' },
      { type: 'text', hint: 'Approche globale (180 mots)' },
      { type: 'services', hint: 'Bento services premium 6 cards' },
      { type: 'feature-grid', hint: 'Bénéfices clés' },
      { type: 'timeline', hint: 'Processus en 4-5 étapes' },
      { type: 'gallery', hint: 'Réalisations 8 visuels' },
      { type: 'testimonials', hint: '3 témoignages projets' },
      { type: 'counters', hint: 'Quelques chiffres parlants' },
      { type: 'faq', hint: '6 questions fréquentes sur les prestations' },
      { type: 'cta-banner', hint: 'CTA demander un devis' },
    ];
  }
  if (slug.includes('realisations') || slug.includes('portfolio')) {
    return [
      { type: 'parallax-hero', hint: 'Hero "Réalisations"' },
      { type: 'text', hint: 'Mot d\'intro (120 mots)' },
      { type: 'gallery', hint: 'Grille filtrable 12 visuels avec catégories' },
      { type: 'counters', hint: 'Stats des projets livrés' },
      { type: 'parallax-slider', hint: 'Slider 4 projets phares' },
      { type: 'testimonials', hint: '3 témoignages clients projet' },
      { type: 'logo-cloud', hint: 'Clients qui nous ont fait confiance' },
      { type: 'cta-banner', hint: 'CTA discuter projet' },
      { type: 'spacer', hint: '40px' },
      { type: 'cta', hint: 'CTA secondaire vers /contact' },
    ];
  }
  if (slug.includes('temoignages')) {
    return [
      { type: 'parallax-hero', hint: 'Hero témoignages' },
      { type: 'text', hint: 'Introduction (100 mots)' },
      { type: 'testimonials', hint: '6 témoignages variés avec photo' },
      { type: 'counters', hint: '4 chiffres : note moyenne, clients servis, recommandations' },
      { type: 'logo-cloud', hint: 'Logos clients' },
      { type: 'gallery', hint: '6 photos de réalisations associées' },
      { type: 'marquee', hint: 'Citations clients en bandeau' },
      { type: 'cta-banner', hint: 'CTA rejoindre la liste des satisfaits' },
      { type: 'spacer', hint: '40px' },
      { type: 'cta', hint: 'CTA contact' },
    ];
  }
  if (slug.includes('blog')) {
    return [
      { type: 'parallax-hero', hint: 'Hero "Blog & Inspirations"' },
      { type: 'text', hint: 'Mot d\'accueil sur la ligne éditoriale' },
      { type: 'feature-grid', hint: '3 catégories phares' },
      { type: 'gallery', hint: 'Mosaïque des derniers articles 8 visuels' },
      { type: 'columns', hint: '3 articles à la une avec icône' },
      { type: 'marquee', hint: 'Mots-clés en bandeau' },
      { type: 'cta', hint: 'S\'abonner à la newsletter' },
      { type: 'spacer', hint: '40px' },
      { type: 'testimonials', hint: '2-3 retours lecteurs' },
      { type: 'cta-banner', hint: 'CTA proposer un sujet' },
    ];
  }
  if (slug.includes('tarifs') || slug.includes('pricing')) {
    return [
      { type: 'parallax-hero', hint: 'Hero "Tarifs"' },
      { type: 'text', hint: 'Notre philosophie tarifaire (150 mots)' },
      { type: 'pricing', hint: '3 plans : Essentiel, Premium (highlight), Sur-mesure' },
      { type: 'feature-grid', hint: 'Ce qui est inclus dans tous les plans' },
      { type: 'testimonials', hint: '3 clients qui parlent du rapport qualité-prix' },
      { type: 'counters', hint: 'Clients satisfaits, projets livrés' },
      { type: 'faq', hint: '6 questions fréquentes sur les tarifs' },
      { type: 'cta-banner', hint: 'CTA demander un devis personnalisé' },
      { type: 'spacer', hint: '40px' },
      { type: 'cta', hint: 'CTA contact' },
    ];
  }
  if (slug.includes('contact')) {
    return [
      { type: 'parallax-hero', hint: 'Hero contact' },
      { type: 'text', hint: 'Mot d\'accueil (100 mots)' },
      { type: 'feature-grid', hint: '3 moyens de contact (email, téléphone, RDV)' },
      { type: 'embed', hint: 'Carte Google Maps de l\'adresse' },
      { type: 'counters', hint: 'Réactivité : temps moyen de réponse, clients suivis' },
      { type: 'faq', hint: '4 questions pratiques' },
      { type: 'testimonials', hint: '2 retours sur la qualité du suivi client' },
      { type: 'cta-banner', hint: 'CTA prendre RDV' },
      { type: 'spacer', hint: '40px' },
      { type: 'cta', hint: 'CTA secondaire newsletter' },
    ];
  }
  if (slug.includes('faq')) {
    return [
      { type: 'parallax-hero', hint: 'Hero FAQ' },
      { type: 'text', hint: 'Mot d\'intro (80 mots)' },
      { type: 'faq', hint: '10 questions fréquentes' },
      { type: 'feature-grid', hint: '3 raisons de nous choisir' },
      { type: 'testimonials', hint: '2 témoignages clients' },
      { type: 'counters', hint: 'Quelques chiffres clés' },
      { type: 'cta-banner', hint: 'CTA contact pour autre question' },
      { type: 'spacer', hint: '40px' },
      { type: 'cta', hint: 'CTA secondaire' },
      { type: 'logo-cloud', hint: 'Logos partenaires' },
    ];
  }
  // Generic
  return [
    { type: 'parallax-hero', hint: `Hero de la page "${slug}"` },
    { type: 'text', hint: 'Présentation (200 mots)' },
    { type: 'feature-grid', hint: '3 bénéfices clés' },
    { type: 'parallax-slider', hint: 'Galerie 3-4 visuels' },
    { type: 'counters', hint: '4 chiffres parlants' },
    { type: 'testimonials', hint: '3 témoignages' },
    { type: 'faq', hint: '4 questions fréquentes' },
    { type: 'gallery', hint: '8 visuels' },
    { type: 'cta-banner', hint: 'CTA principal' },
    { type: 'cta', hint: 'CTA secondaire' },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// GÉNÉRATION D'UN BLOC TYPÉ — appel IA + images
// ═══════════════════════════════════════════════════════════════════

interface GenSectionOpts {
  orgId: string;
  tenantDb: any;
  brief: string;
  audience: string;
  tone: string;
  pageTitle: string;
  pageSlug: string;
  sectionType: string;
  hint: string;
  knownPageSlugs: string[];
  isFirst: boolean;
  indexOnPage: number;
}

/** Sections qui ne nécessitent aucun appel IA pour le contenu textuel. */
const NO_AI_SECTIONS = new Set(['spacer', 'marquee', 'logo-cloud']);

/** Sections qui nécessitent au moins une image (hero, image, slider, gallery, team). */
const NEEDS_IMAGE: Record<string, number> = {
  'parallax-hero': 1, 'image': 1, 'hero': 1,
  'parallax-slider': 4, 'gallery': 9, 'team': 4,
};

async function generateSectionBlock(opts: GenSectionOpts): Promise<any | null> {
  const { orgId, tenantDb, brief, audience, tone, pageTitle, pageSlug, sectionType, hint, knownPageSlugs, isFirst, indexOnPage } = opts;

  // Pour spacer : pas d'IA
  if (sectionType === 'spacer') {
    return { type: 'spacer', width: 'full', data: { height: 60 } };
  }

  const pageList = knownPageSlugs.join(', ');
  const baseCtx = `Brief : "${brief}". Audience : ${audience || 'large'}. Ton : ${tone || 'professionnel'}. Page : "${pageTitle}" (${pageSlug}). Pages du site : ${pageList}.
CONTRAINTES : français, pas de mention religieuse, factuel et chaleureux. Pas d'emoji dans les titres principaux (sauf champ "icon" dédié).`;

  const safeHref = (h: string | undefined | null): string => {
    if (!h) return knownPageSlugs.find((s) => s !== pageSlug) || '/';
    if (typeof h !== 'string') return '/';
    if (h.startsWith('http')) return h;
    if (h.startsWith('/')) {
      // Vérifie si la page existe (ou est candidate)
      const matches = knownPageSlugs.includes(h) || CANDIDATE_PAGES.some((c) => c.slug === h);
      return matches ? h : (knownPageSlugs.find((s) => s !== pageSlug) || '/');
    }
    return `/${h}`;
  };

  // ── SCHÉMA JSON par type ─────────────────────────────────────────
  let schemaHint = '';
  switch (sectionType) {
    case 'parallax-hero':
      schemaHint = `{ "title": "<4-8 mots>", "subtitle": "<10-20 mots>", "ctaLabel": "<2-3 mots>", "ctaHref": "<page du site>" }`;
      break;
    case 'text':
      schemaHint = `{ "html": "<<h2>Titre</h2><p>200-280 mots…</p>>" }`;
      break;
    case 'image':
      schemaHint = `{ "alt": "<5-10 mots>", "caption": "<8-15 mots>" }`;
      break;
    case 'video':
      schemaHint = `{ "src": "<URL YouTube ou vidéo>", "caption": "<8-15 mots>" }`;
      break;
    case 'columns':
      schemaHint = `{ "columns": [
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "body": "<25-40 mots>" },
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "body": "<25-40 mots>" },
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "body": "<25-40 mots>" }
] }`;
      break;
    case 'cta':
      schemaHint = `{ "title": "<question/invitation>", "subtitle": "<1 phrase>", "label": "<2-3 mots>", "href": "<page>" }`;
      break;
    case 'parallax-slider':
      schemaHint = `{ "slides": [
  { "title": "<3-5 mots>", "subtitle": "<10-15 mots>", "tagline": "01" },
  { "title": "<3-5 mots>", "subtitle": "<10-15 mots>", "tagline": "02" },
  { "title": "<3-5 mots>", "subtitle": "<10-15 mots>", "tagline": "03" },
  { "title": "<3-5 mots>", "subtitle": "<10-15 mots>", "tagline": "04" }
] }`;
      break;
    case 'embed':
      schemaHint = `{ "html": "<iframe Google Maps valide HTTPS pour le contexte, sans script>" }`;
      break;
    case 'gallery':
      schemaHint = `{ "title": "<3-5 mots>", "categories": ["Catégorie 1", "Catégorie 2", "Catégorie 3"], "images": [
  { "alt": "<5-10 mots>", "category": "Catégorie 1" },
  { "alt": "<5-10 mots>", "category": "Catégorie 1" },
  { "alt": "<5-10 mots>", "category": "Catégorie 2" },
  { "alt": "<5-10 mots>", "category": "Catégorie 2" },
  { "alt": "<5-10 mots>", "category": "Catégorie 3" },
  { "alt": "<5-10 mots>", "category": "Catégorie 3" },
  { "alt": "<5-10 mots>", "category": "Catégorie 1" },
  { "alt": "<5-10 mots>", "category": "Catégorie 2" }
] }`;
      break;
    case 'pricing':
      schemaHint = `{ "title": "<3-5 mots>", "subtitle": "<10-15 mots>", "plans": [
  { "name": "Essentiel", "price": "49€", "period": "/mois", "description": "<10 mots>", "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"], "highlight": false, "ctaLabel": "Choisir", "ctaHref": "/contact" },
  { "name": "Premium", "price": "99€", "period": "/mois", "description": "<10 mots>", "features": ["Tout l'Essentiel", "Feature 5", "Feature 6", "Feature 7", "Feature 8"], "highlight": true, "ctaLabel": "Choisir", "ctaHref": "/contact" },
  { "name": "Sur-mesure", "price": "Sur devis", "period": "", "description": "<10 mots>", "features": ["Tout Premium", "Feature 9", "Feature 10", "Accompagnement dédié"], "highlight": false, "ctaLabel": "Demander", "ctaHref": "/contact" }
] }`;
      break;
    case 'testimonials':
      schemaHint = `{ "title": "<3-5 mots>", "items": [
  { "name": "<prénom + nom>", "role": "<fonction + entreprise>", "quote": "<30-50 mots de témoignage authentique>", "rating": 5 },
  { "name": "<prénom + nom>", "role": "<fonction + entreprise>", "quote": "<30-50 mots>", "rating": 5 },
  { "name": "<prénom + nom>", "role": "<fonction + entreprise>", "quote": "<30-50 mots>", "rating": 4 },
  { "name": "<prénom + nom>", "role": "<fonction + entreprise>", "quote": "<30-50 mots>", "rating": 5 }
] }`;
      break;
    case 'faq':
      schemaHint = `{ "title": "<3-5 mots>", "items": [
  { "q": "<question ?>", "a": "<réponse 30-60 mots>" },
  { "q": "<question ?>", "a": "<réponse 30-60 mots>" },
  { "q": "<question ?>", "a": "<réponse 30-60 mots>" },
  { "q": "<question ?>", "a": "<réponse 30-60 mots>" },
  { "q": "<question ?>", "a": "<réponse 30-60 mots>" },
  { "q": "<question ?>", "a": "<réponse 30-60 mots>" }
] }`;
      break;
    case 'counters':
      schemaHint = `{ "items": [
  { "value": 10, "suffix": "+", "label": "<2-4 mots>" },
  { "value": 250, "suffix": "", "label": "<2-4 mots>" },
  { "value": 98, "suffix": "%", "label": "<2-4 mots>" },
  { "value": 24, "suffix": "h", "label": "<2-4 mots>" }
] }`;
      break;
    case 'team':
      schemaHint = `{ "title": "<3-5 mots>", "subtitle": "<10 mots>", "members": [
  { "name": "<prénom + nom>", "role": "<fonction>", "bio": "<15-25 mots>", "socials": { "linkedin": "https://linkedin.com/in/x" } },
  { "name": "<prénom + nom>", "role": "<fonction>", "bio": "<15-25 mots>", "socials": {} },
  { "name": "<prénom + nom>", "role": "<fonction>", "bio": "<15-25 mots>", "socials": {} },
  { "name": "<prénom + nom>", "role": "<fonction>", "bio": "<15-25 mots>", "socials": {} }
] }`;
      break;
    case 'services':
      schemaHint = `{ "title": "<3-5 mots>", "subtitle": "<10-15 mots>", "services": [
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "desc": "<15-25 mots>", "link": "/services", "big": true },
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "desc": "<15-25 mots>", "link": "/services", "big": true },
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "desc": "<10-15 mots>", "link": "/services", "big": false },
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "desc": "<10-15 mots>", "link": "/services", "big": false },
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "desc": "<10-15 mots>", "link": "/services", "big": false },
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "desc": "<10-15 mots>", "link": "/services", "big": false }
] }`;
      break;
    case 'timeline':
      schemaHint = `{ "title": "<3-5 mots>", "steps": [
  { "date": "Étape 1", "title": "<3-5 mots>", "desc": "<15-25 mots>", "icon": "1" },
  { "date": "Étape 2", "title": "<3-5 mots>", "desc": "<15-25 mots>", "icon": "2" },
  { "date": "Étape 3", "title": "<3-5 mots>", "desc": "<15-25 mots>", "icon": "3" },
  { "date": "Étape 4", "title": "<3-5 mots>", "desc": "<15-25 mots>", "icon": "4" }
] }`;
      break;
    case 'marquee':
      schemaHint = `{ "items": ["<phrase 3-5 mots>", "<phrase 3-5 mots>", "<phrase 3-5 mots>", "<phrase 3-5 mots>", "<phrase 3-5 mots>", "<phrase 3-5 mots>", "<phrase 3-5 mots>"], "speed": "medium", "variant": "text" }`;
      break;
    case 'cta-banner':
      schemaHint = `{ "title": "<5-10 mots énergiques>", "subtitle": "<10-20 mots>", "primaryCta": { "label": "<2-3 mots>", "href": "/contact" }, "secondaryCta": { "label": "<2-3 mots>", "href": "/services" } }`;
      break;
    case 'logo-cloud':
      schemaHint = `{ "title": "<3-6 mots ex: 'Ils nous font confiance'>", "logos": [
  { "alt": "<Nom marque 1>" }, { "alt": "<Nom marque 2>" }, { "alt": "<Nom marque 3>" },
  { "alt": "<Nom marque 4>" }, { "alt": "<Nom marque 5>" }, { "alt": "<Nom marque 6>" }
] }`;
      break;
    case 'feature-grid':
      schemaHint = `{ "title": "<3-5 mots>", "subtitle": "<10-15 mots>", "features": [
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "desc": "<15-25 mots>", "span": 2 },
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "desc": "<15-25 mots>", "span": 1 },
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "desc": "<15-25 mots>", "span": 1 },
  { "icon": "<1 emoji>", "title": "<3-5 mots>", "desc": "<15-25 mots>", "span": 2 }
] }`;
      break;
    case 'hero':
      schemaHint = `{ "title": "<4-8 mots>", "subtitle": "<10-20 mots>", "cta": { "label": "<2-3 mots>", "href": "/contact" } }`;
      break;
    default:
      schemaHint = `{ "html": "<p>Section ${sectionType}</p>" }`;
  }

  // ── Appel IA texte ──────────────────────────────────────────────
  let parsed: any = {};
  if (!NO_AI_SECTIONS.has(sectionType)) {
    const prompt = `${baseCtx}
Tu génères le contenu JSON d'une section de type "${sectionType}".
Indication : ${hint || 'aucune indication particulière'}.
${isFirst && sectionType === 'parallax-hero' ? "C'est la PREMIÈRE section de la page → maximise l'impact visuel." : ''}

Retourne UNIQUEMENT le JSON suivant ce schéma, rien d'autre, pas de texte autour :
${schemaHint}`;
    try {
      const res = await aiCall({ orgId, feature: 'text', prompt, temperature: 0.85, maxTokens: 2000 });
      if (res.ok && res.output) {
        const m = res.output.match(/\{[\s\S]+\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch { parsed = {}; }
        }
      }
    } catch { /* keep empty */ }
  } else {
    // marquee / logo-cloud : on génère quand même un peu de texte
    if (sectionType === 'marquee') {
      const items = (await safeAiArray(orgId, `Pour "${brief}" sur la page "${pageTitle}" : génère 8 courtes citations/mots-clés pour un bandeau défilant. Réponds en JSON: { "items": ["…","…",…] }`)) || [];
      parsed = { items, speed: 'medium', variant: 'text' };
    }
    if (sectionType === 'logo-cloud') {
      const items = (await safeAiArray(orgId, `Pour "${brief}" : génère 6 noms de marques/partenaires fictifs cohérents avec le secteur. Réponds en JSON: { "items": ["Marque1","Marque2",…] }`)) || [];
      parsed = { title: 'Ils nous font confiance', logos: items.map((alt: string) => ({ alt })) };
    }
  }

  // ── Génération d'images selon le type ───────────────────────────
  const imgCount = NEEDS_IMAGE[sectionType] || 0;
  let images: string[] = [];
  if (imgCount > 0) {
    const kw = `${extractKeywords(brief)},${extractKeywords(pageTitle + ' ' + (hint || ''))}`;
    const imgPrompt = `${brief}, ${pageTitle}, ${hint || ''}`.trim();
    if (imgCount === 1) {
      const r = await generateAiImage({
        orgId, tenantDb,
        prompt: imgPrompt,
        size: 'landscape_16_9',
        unsplashKeywords: kw,
        seed: `${pageSlug}-${sectionType}-${indexOnPage}`,
      });
      if (r.url) images = [r.url];
    } else {
      images = await generateAiImageBatch(
        {
          orgId, tenantDb,
          prompt: imgPrompt,
          size: sectionType === 'team' ? 'portrait_4_3' : sectionType === 'gallery' ? 'square' : 'landscape_16_9',
          unsplashKeywords: kw,
        },
        imgCount,
      );
    }
  }

  // ── Normalisation par type → bloc final ─────────────────────────
  switch (sectionType) {
    case 'parallax-hero':
      return {
        type: 'parallax-hero', width: 'full',
        data: {
          title: parsed.title || pageTitle,
          subtitle: parsed.subtitle || '',
          ctaLabel: parsed.ctaLabel || 'Découvrir',
          ctaHref: safeHref(parsed.ctaHref),
          bgImage: images[0],
          height: '90vh',
        },
      };
    case 'hero':
      return {
        type: 'hero', width: 'full',
        data: {
          title: parsed.title || pageTitle,
          subtitle: parsed.subtitle || '',
          bgImage: images[0],
          cta: { label: parsed.cta?.label || 'Découvrir', href: safeHref(parsed.cta?.href) },
        },
      };
    case 'text':
      return { type: 'text', width: 'full', data: { html: parsed.html || `<p>${pageTitle}.</p>` } };
    case 'columns': {
      const cols = Array.isArray(parsed.columns) && parsed.columns.length > 0
        ? parsed.columns.slice(0, 4)
        : [
            { title: 'Notre vision', body: 'Une approche moderne.' },
            { title: 'Notre équipe', body: 'Des passionnés engagés.' },
            { title: 'Notre engagement', body: 'Qualité et écoute.' },
          ];
      return {
        type: 'columns', width: 'full',
        data: {
          columns: cols.map((c: any) => ({
            icon: c.icon || '', title: c.title || '', body: c.body || '',
            html: `${c.title ? `<h3>${c.title}</h3>` : ''}${c.body ? `<p>${c.body}</p>` : ''}`,
          })),
        },
      };
    }
    case 'cta':
      return {
        type: 'cta', width: 'full',
        data: {
          title: parsed.title || "Envie d'en savoir plus ?",
          subtitle: parsed.subtitle || '',
          label: parsed.label || 'Découvrir',
          href: safeHref(parsed.href),
        },
      };
    case 'image':
      return {
        type: 'image', width: 'full',
        data: { src: images[0], alt: parsed.alt || pageTitle, caption: parsed.caption || '' },
      };
    case 'video':
      return {
        type: 'video', width: 'full',
        data: { src: parsed.src || '', caption: parsed.caption || '' },
      };
    case 'parallax-slider': {
      const slides = Array.isArray(parsed.slides) && parsed.slides.length > 0
        ? parsed.slides.slice(0, 6)
        : [
            { title: 'Inspiration', subtitle: 'Un univers à découvrir', tagline: '01' },
            { title: 'Création', subtitle: 'Chaque détail compte', tagline: '02' },
            { title: 'Passion', subtitle: 'Pour transmettre une émotion', tagline: '03' },
          ];
      return {
        type: 'parallax-slider', width: 'full',
        data: {
          slides: slides.map((s: any, idx: number) => ({
            title: s.title || `Slide ${idx + 1}`,
            subtitle: s.subtitle || '',
            tagline: s.tagline || `0${idx + 1}`,
            image: s.image || images[idx % Math.max(images.length, 1)] || '',
          })),
          height: '85vh', autoplay: true,
        },
      };
    }
    case 'embed':
      return { type: 'embed', width: 'full', data: { html: parsed.html || '' } };

    // ── Nouveaux blocs ──
    case 'gallery': {
      const imgs = Array.isArray(parsed.images) ? parsed.images.slice(0, 12) : [];
      const cats: string[] = Array.isArray(parsed.categories) ? parsed.categories.slice(0, 5) : [];
      // Attache une image générée à chaque entrée
      const withSrc = imgs.map((im: any, k: number) => ({
        src: images[k % Math.max(images.length, 1)] || '',
        alt: im.alt || `Photo ${k + 1}`,
        category: im.category || cats[0] || 'Tous',
      }));
      // Si IA n'a pas fourni, on remplit depuis images
      const finalImages = withSrc.length > 0 ? withSrc : images.map((src, k) => ({ src, alt: `Photo ${k + 1}`, category: 'Tous' }));
      return {
        type: 'gallery', width: 'full',
        data: { title: parsed.title || 'Galerie', images: finalImages, categories: cats },
      };
    }
    case 'pricing': {
      const plans = Array.isArray(parsed.plans) ? parsed.plans.slice(0, 4) : [];
      const safePlans = plans.map((p: any) => ({
        name: p.name || 'Plan',
        price: p.price || '—',
        yearlyPrice: p.yearlyPrice || '',
        period: p.period || '',
        description: p.description || '',
        features: Array.isArray(p.features) ? p.features.slice(0, 10) : [],
        highlight: !!p.highlight,
        ctaLabel: p.ctaLabel || 'Choisir',
        ctaHref: safeHref(p.ctaHref || '/contact'),
      }));
      return {
        type: 'pricing', width: 'full',
        data: {
          title: parsed.title || 'Tarifs',
          subtitle: parsed.subtitle || '',
          plans: safePlans.length > 0 ? safePlans : DEFAULT_PRICING_PLANS,
        },
      };
    }
    case 'testimonials': {
      const items = Array.isArray(parsed.items) ? parsed.items.slice(0, 8) : [];
      return {
        type: 'testimonials', width: 'full',
        data: {
          title: parsed.title || 'Ils en parlent',
          items: items.map((t: any, k: number) => ({
            name: t.name || `Client ${k + 1}`,
            role: t.role || '',
            quote: t.quote || '',
            rating: typeof t.rating === 'number' ? t.rating : 5,
            photo: '',
          })),
        },
      };
    }
    case 'faq': {
      const items = Array.isArray(parsed.items) ? parsed.items.slice(0, 16) : [];
      return {
        type: 'faq', width: 'full',
        data: {
          title: parsed.title || 'Questions fréquentes',
          items: items.map((it: any) => ({ q: it.q || '', a: it.a || '' })),
        },
      };
    }
    case 'counters': {
      const items = Array.isArray(parsed.items) ? parsed.items.slice(0, 6) : [];
      return {
        type: 'counters', width: 'full',
        data: {
          items: items.map((it: any) => ({
            value: Number(it.value) || 0,
            suffix: it.suffix || '',
            label: it.label || '',
          })),
        },
      };
    }
    case 'team': {
      const members = Array.isArray(parsed.members) ? parsed.members.slice(0, 8) : [];
      return {
        type: 'team', width: 'full',
        data: {
          title: parsed.title || 'Notre équipe',
          subtitle: parsed.subtitle || '',
          members: members.map((m: any, k: number) => ({
            name: m.name || `Membre ${k + 1}`,
            role: m.role || '',
            bio: m.bio || '',
            photo: images[k % Math.max(images.length, 1)] || '',
            socials: m.socials || {},
          })),
        },
      };
    }
    case 'services': {
      const svcs = Array.isArray(parsed.services) ? parsed.services.slice(0, 8) : [];
      return {
        type: 'services', width: 'full',
        data: {
          title: parsed.title || 'Nos services',
          subtitle: parsed.subtitle || '',
          services: svcs.map((s: any) => ({
            icon: s.icon || '',
            title: s.title || '',
            desc: s.desc || '',
            link: safeHref(s.link || '/services'),
            big: !!s.big,
          })),
        },
      };
    }
    case 'timeline': {
      const steps = Array.isArray(parsed.steps) ? parsed.steps.slice(0, 12) : [];
      return {
        type: 'timeline', width: 'full',
        data: {
          title: parsed.title || 'Notre parcours',
          steps: steps.map((s: any, k: number) => ({
            date: s.date || `Étape ${k + 1}`,
            title: s.title || '',
            desc: s.desc || '',
            icon: s.icon || String(k + 1),
          })),
        },
      };
    }
    case 'marquee':
      return {
        type: 'marquee', width: 'full',
        data: {
          items: Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items.slice(0, 12) :
            ['Excellence', 'Précision', 'Élégance', 'Authenticité', 'Innovation', 'Passion', 'Engagement', 'Qualité'],
          speed: parsed.speed === 'slow' || parsed.speed === 'fast' ? parsed.speed : 'medium',
          variant: parsed.variant === 'logos' ? 'logos' : 'text',
        },
      };
    case 'cta-banner':
      return {
        type: 'cta-banner', width: 'full',
        data: {
          title: parsed.title || 'Prêt à passer à l\'action ?',
          subtitle: parsed.subtitle || '',
          primaryCta: { label: parsed.primaryCta?.label || 'Nous contacter', href: safeHref(parsed.primaryCta?.href || '/contact') },
          secondaryCta: parsed.secondaryCta?.label ? { label: parsed.secondaryCta.label, href: safeHref(parsed.secondaryCta.href || '/services') } : undefined,
          bgGradient: undefined,
        },
      };
    case 'logo-cloud': {
      const logos = Array.isArray(parsed.logos) ? parsed.logos.slice(0, 12) : [];
      return {
        type: 'logo-cloud', width: 'full',
        data: { title: parsed.title || 'Ils nous font confiance', logos: logos.map((l: any) => ({ src: l.src || '', alt: l.alt || '' })) },
      };
    }
    case 'feature-grid': {
      const features = Array.isArray(parsed.features) ? parsed.features.slice(0, 8) : [];
      return {
        type: 'feature-grid', width: 'full',
        data: {
          title: parsed.title || '',
          subtitle: parsed.subtitle || '',
          features: features.map((f: any) => ({
            icon: f.icon || '',
            title: f.title || '',
            desc: f.desc || '',
            span: f.span === 2 ? 2 : 1,
          })),
        },
      };
    }
    default:
      return { type: 'text', width: 'full', data: { html: parsed.html || `<p>${pageTitle}.</p>` } };
  }
}

const DEFAULT_PRICING_PLANS = [
  { name: 'Essentiel', price: '49€', period: '/mois', description: 'Pour démarrer en douceur', features: ['Fonctionnalité 1', 'Fonctionnalité 2', 'Fonctionnalité 3', 'Support email'], highlight: false, ctaLabel: 'Choisir', ctaHref: '/contact' },
  { name: 'Premium', price: '99€', period: '/mois', description: 'Le plus populaire', features: ['Tout l\'Essentiel', 'Fonctionnalité avancée', 'Personnalisation', 'Support prioritaire'], highlight: true, ctaLabel: 'Choisir', ctaHref: '/contact' },
  { name: 'Sur-mesure', price: 'Sur devis', period: '', description: 'Pour les besoins spécifiques', features: ['Tout Premium', 'Accompagnement dédié', 'SLA personnalisé'], highlight: false, ctaLabel: 'Demander', ctaHref: '/contact' },
];

// ═══════════════════════════════════════════════════════════════════
// THEME DERIVATION — palette HSL + fonts whitelistées
// ═══════════════════════════════════════════════════════════════════

/** Fonts Google Fonts whitelistées (chargées dynamiquement côté render). */
const FONT_WHITELIST = [
  'Inter', 'Poppins', 'Playfair Display', 'DM Sans', 'Manrope',
  'Bricolage Grotesque', 'Outfit', 'Fraunces', 'Cormorant Garamond',
  'Space Grotesk', 'Plus Jakarta Sans', 'Lora', 'Marcellus', 'Cinzel',
] as const;

/** Renvoie le nom de font normalisé si dans la whitelist, sinon `null`. */
function normalizeFont(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim().replace(/^["']|["']$/g, '');
  // Match exact (insensible à la casse)
  const hit = FONT_WHITELIST.find((f) => f.toLowerCase() === s.toLowerCase());
  return hit || null;
}

/** Wrap d'une font en stack CSS avec fallback. */
function fontStack(name: string | null, kind: 'heading' | 'body'): string {
  const fallbackHeading = '"Playfair Display", Georgia, serif';
  const fallbackBody = '"Inter", system-ui, -apple-system, sans-serif';
  if (!name) return kind === 'heading' ? fallbackHeading : fallbackBody;
  // Serif vs sans-serif fallback selon connaissance
  const serifFonts = new Set(['Playfair Display', 'Fraunces', 'Cormorant Garamond', 'Lora', 'Marcellus', 'Cinzel']);
  const fb = serifFonts.has(name) ? 'Georgia, serif' : 'system-ui, -apple-system, sans-serif';
  return `"${name}", ${fb}`;
}

/** hex → HSL [h, s, l] (0-360, 0-100, 0-100). */
function hexToHsl(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return [290, 80, 55]; // fallback fuchsia
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: hh = ((b - r) / d + 2); break;
      case b: hh = ((r - g) / d + 4); break;
    }
    hh *= 60;
  }
  return [Math.round(hh), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const v = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Rotation de teinte sur le cercle chromatique. */
function rotateHue(hex: string, deg: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex((h + deg + 360) % 360, s, l);
}

interface BuildThemeOpts {
  primaryColor: string | null;
  font: string | null;
  palette: any | null;
}

/**
 * Construit un theme complet (palette + fonts + radius + spacing)
 * à partir des choix utilisateur du wizard et de la palette du template.
 */
function buildSiteTheme(opts: BuildThemeOpts) {
  const primary = opts.primaryColor || opts.palette?.primary || '#d946ef';
  const secondary = opts.palette?.secondary || rotateHue(primary, 180);
  const accent = opts.palette?.accent || rotateHue(primary, 60);
  const background = opts.palette?.background || '#0a0a0f';
  const foreground = opts.palette?.foreground || '#fafafa';

  // Fonts : si l'user a choisi une font → s'applique à heading + body
  // Sinon : palette template → heading=fontHeading, body=fontBody
  const userFont = normalizeFont(opts.font);
  const tplHeading = normalizeFont(opts.palette?.fontHeading);
  const tplBody = normalizeFont(opts.palette?.fontBody);

  const fontHeadingName = userFont || tplHeading || 'Playfair Display';
  const fontBodyName = userFont || tplBody || 'Inter';

  return {
    primary,
    secondary,
    accent,
    background,
    foreground,
    fontHeading: fontStack(fontHeadingName, 'heading'),
    fontBody: fontStack(fontBodyName, 'body'),
    // Champs internes utiles côté render : noms bruts pour Google Fonts loader
    fontHeadingName,
    fontBodyName,
    radius: opts.palette?.radius || '1rem',
    spacing: opts.palette?.spacing || 'comfortable',
  };
}

/** Petit helper IA qui demande un { items: [...] } et retourne le tableau (ou []). */
async function safeAiArray(orgId: string, prompt: string): Promise<any[]> {
  try {
    const res = await aiCall({ orgId, feature: 'text', prompt, temperature: 0.7, maxTokens: 600 });
    if (res.ok && res.output) {
      const m = res.output.match(/\{[\s\S]+\}/);
      if (m) {
        const j = JSON.parse(m[0]);
        if (Array.isArray(j.items)) return j.items;
      }
    }
  } catch { /* ignore */ }
  return [];
}
