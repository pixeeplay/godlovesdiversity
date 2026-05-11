import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';
import { platformDb } from '@pixeesite/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `Tu es un directeur artistique web. À partir de la description du business du client, tu génères un thème complet.

RÉPONDS UNIQUEMENT EN JSON STRICT, sans markdown, sans backticks, sans commentaire :
{
  "name": "Nom du business (3-5 mots)",
  "primaryColor": "#hex (couleur principale qui matche le secteur)",
  "secondaryColor": "#hex (couleur d'accent complémentaire)",
  "font": "Inter | Poppins | DM Sans | Manrope | Playfair Display | Space Grotesk | Bebas Neue | Lora",
  "tone": "luxe | minimaliste | bohème | corporate | fun | brutalist | éditorial",
  "tagline": "Phrase d'accroche 5-10 mots",
  "heroTitle": "Titre principal 3-7 mots",
  "heroSubtitle": "Sous-titre 10-20 mots",
  "heroCtaLabel": "Texte du bouton 2-4 mots",
  "heroBgKeyword": "mot-clé Unsplash en anglais (ex: mountain, café, fashion)",
  "aboutHtml": "<h2>...</h2><p>...</p><p>...</p> (~150 mots, ton alignés au business)",
  "services": [
    { "title": "Service 1 (2-4 mots)", "icon": "emoji", "description": "1-2 phrases" },
    { "title": "Service 2", "icon": "emoji", "description": "..." },
    { "title": "Service 3", "icon": "emoji", "description": "..." }
  ],
  "pages": [
    { "slug": "/", "title": "Accueil" },
    { "slug": "/about", "title": "À propos" },
    { "slug": "/services", "title": "Services" },
    { "slug": "/contact", "title": "Contact" }
  ]
}

Règles couleurs : photographie/luxe = palette dark + gold/wine. Restaurant = warm earth. SaaS = blue/violet. Wellness = sage/sand. Fitness = orange/black. Mode = monochrome + accent. Toujours contraste suffisant pour texte blanc sur le primary.`;

function buildBlocksFromTheme(theme: any) {
  const heroBg = `https://source.unsplash.com/1920x1080/?${encodeURIComponent(theme.heroBgKeyword || theme.tone || 'business')}`;
  return {
    pages: [
      {
        slug: '/', title: 'Accueil', isHome: true,
        blocks: [
          {
            type: 'parallax-hero', width: 'full', effect: 'wow-arrival', effectDelay: 0,
            data: {
              title: theme.heroTitle, subtitle: theme.heroSubtitle,
              ctaLabel: theme.heroCtaLabel || 'Découvrir', ctaHref: '/services',
              bgImage: heroBg,
              bgGradient: `linear-gradient(180deg, ${theme.primaryColor}33 0%, ${theme.secondaryColor || theme.primaryColor}88 100%)`,
              overlayColor: 'rgba(0,0,0,0.40)', height: '92vh',
              floatingText: (theme.tagline || '').toUpperCase().slice(0, 8),
            },
          },
          {
            type: 'text', width: 'full', effect: 'fade-up', effectDelay: 100,
            data: { html: theme.aboutHtml || `<h2>${theme.heroTitle}</h2><p>${theme.heroSubtitle}</p>` },
          },
          ...(theme.services || []).slice(0, 3).map((s: any, i: number) => ({
            type: 'feature-card', width: i === 0 ? 'full' : 'half',
            effect: 'fade-up', effectDelay: 100 + i * 50,
            data: { icon: s.icon, title: s.title, description: s.description },
          })),
          { type: 'cta', width: 'full', effect: 'bounce-in', effectDelay: 300,
            data: { label: theme.heroCtaLabel || 'Nous contacter', href: '/contact' } },
        ],
      },
      {
        slug: '/about', title: 'À propos',
        blocks: [{ type: 'text', width: 'full', data: { html: theme.aboutHtml || `<h1>À propos</h1>` } }],
      },
      {
        slug: '/services', title: 'Services',
        blocks: [
          { type: 'text', width: 'full', data: { html: '<h1>Nos services</h1>' } },
          ...(theme.services || []).map((s: any) => ({
            type: 'feature-card', width: 'half',
            data: { icon: s.icon, title: s.title, description: s.description },
          })),
        ],
      },
      {
        slug: '/contact', title: 'Contact',
        blocks: [{ type: 'text', width: 'full', data: { html: '<h1>Contact</h1><p>Envoyez-nous un message via le formulaire.</p>' } }],
      },
    ],
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.brief) return NextResponse.json({ error: 'brief required (description du business)' }, { status: 400 });

  // Call AI
  const result = await aiCall({
    orgId: auth.membership.org.id,
    feature: 'text',
    prompt: `Description du business : "${b.brief}"\n\nGénère le thème complet en JSON.`,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.8,
    maxTokens: 2400,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'AI failed', provider: result.provider }, { status: 500 });
  }

  // Parse JSON
  let theme: any;
  try {
    const m = result.output.match(/\{[\s\S]+\}/);
    if (!m) throw new Error('Aucun JSON détecté');
    theme = JSON.parse(m[0]);
  } catch (e: any) {
    return NextResponse.json({
      error: 'Parsing JSON IA échoué', raw: result.output.slice(0, 800),
    }, { status: 500 });
  }

  // Apply theme to org if requested
  if (b.apply) {
    await platformDb.org.update({
      where: { id: auth.membership.org.id },
      data: {
        primaryColor: theme.primaryColor || undefined,
        font: theme.font || undefined,
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    theme,
    blocksSeed: buildBlocksFromTheme(theme),
    applied: !!b.apply,
    provider: result.provider, model: result.model,
  });
}
