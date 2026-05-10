import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { callGeminiText, GEMINI_MODELS } from '@/lib/gemini-text';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/page-builder/generate-ai
 * Body : {
 *   slug: 'mariage-2026',
 *   prompt: 'Page photographe de mariage avec parallax hero + portfolio + CTA',
 *   theme?: 'photo' | 'video' | 'spirituel' | 'custom',
 *   wantParallaxHero?: true,
 *   wantSlider?: true,
 *   wantVideo?: true,
 *   imageUrls?: string[]   // images de l'utilisateur a inclure
 *   mode?: 'replace' | 'append',
 *   dryRun?: false
 * }
 *
 * Demande à Gemini de générer la structure JSON de blocs PageBlock,
 * puis sauvegarde en DB. Retourne les blocs créés.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const slug: string = (body.slug as string)?.trim();
  const prompt: string = (body.prompt as string)?.trim() || '';
  const theme: string = body.theme || 'custom';
  const wantParallaxHero: boolean = body.wantParallaxHero !== false;
  const wantSlider: boolean = !!body.wantSlider;
  const wantVideo: boolean = !!body.wantVideo;
  const imageUrls: string[] = Array.isArray(body.imageUrls) ? body.imageUrls.slice(0, 12) : [];
  const videoUrl: string = body.videoUrl || '';
  const mode = body.mode || 'replace';
  const dryRun = body.dryRun === true;

  if (!slug) return NextResponse.json({ error: 'slug-required' }, { status: 400 });
  if (!prompt) return NextResponse.json({ error: 'prompt-required' }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'gemini-api-key-missing' }, { status: 500 });

  // Schéma JSON strict pour Gemini
  const schema = {
    type: 'object',
    properties: {
      pageTitle: { type: 'string' },
      blocks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['hero', 'parallax-hero', 'parallax-slider', 'text', 'image', 'video', 'cta', 'columns', 'spacer']
            },
            width: {
              type: 'string',
              enum: ['1/4', '1/3', '1/2', '2/3', '3/4', 'full']
            },
            effect: { type: 'string' },
            effectDelay: { type: 'integer' },
            data: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                subtitle: { type: 'string' },
                html: { type: 'string' },
                src: { type: 'string' },
                alt: { type: 'string' },
                href: { type: 'string' },
                label: { type: 'string' },
                bgImage: { type: 'string' },
                bgGradient: { type: 'string' },
                midImage: { type: 'string' },
                fgImage: { type: 'string' },
                floatingText: { type: 'string' },
                ctaLabel: { type: 'string' },
                ctaHref: { type: 'string' },
                height: { type: 'string' },
                slides: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      subtitle: { type: 'string' },
                      tagline: { type: 'string' },
                      image: { type: 'string' },
                      ctaLabel: { type: 'string' },
                      ctaHref: { type: 'string' },
                      accentColor: { type: 'string' }
                    },
                    required: ['title', 'image']
                  }
                },
                columns: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { html: { type: 'string' } }
                  }
                },
                height_px: { type: 'integer' }
              }
            }
          },
          required: ['type', 'width', 'data']
        }
      }
    },
    required: ['pageTitle', 'blocks']
  };

  // Construit le prompt
  const imagesHint = imageUrls.length > 0
    ? `\nL'utilisateur a fourni ces ${imageUrls.length} images, utilise-les dans les blocs image / parallax-slider / parallax-hero (bgImage, midImage, fgImage, slides[].image) :\n${imageUrls.map((u, i) => `  ${i + 1}. ${u}`).join('\n')}`
    : '\nL\'utilisateur n\'a pas fourni d\'images. Utilise des placeholders avec urls /img/placeholder-{n}.jpg ou laisse src vide pour les blocs image.';

  const videoHint = videoUrl
    ? `\nVidéo fournie à inclure : ${videoUrl}`
    : '\nPas de vidéo fournie.';

  const fullPrompt = `Tu es un expert en design web. Génère la STRUCTURE JSON complète d'une page web pour le site "God Loves Diversity" (gld.pixeeplay.com).

Demande de l'utilisateur :
"${prompt}"

Thème : ${theme}
Slug de la page : ${slug}
${imagesHint}
${videoHint}

Contraintes :
- Réponds UNIQUEMENT en JSON valide selon le schema fourni
- Génère 6 à 14 blocs au total pour faire une page complète et engageante
- Le 1er bloc doit être ${wantParallaxHero ? 'OBLIGATOIREMENT type "parallax-hero"' : 'soit "hero" soit "parallax-hero"'} avec un titre fort et un sous-titre inspirant
${wantSlider ? '- Inclus AU MOINS un bloc "parallax-slider" avec 3-4 slides utilisant les images fournies' : ''}
${wantVideo && videoUrl ? '- Inclus un bloc "video" avec la vidéo fournie' : ''}
- Alterne text et image pour rythmer la lecture
- Termine par un bloc "cta" puissant
- Pour les blocs "text" : utilise <h2>, <h3>, <p>, <ul>, <strong> dans le champ html. Tone moderne et inclusif. PAS de tags <html>, <body>, <div> avec class.
- Pour les "effect" : utilise les ID parmi cette liste de 100 effets — entry: fade-up, fade-down, fade-left, fade-right, zoom-in, slide-up, blur-in, bounce-in, elastic-in, tada-in, wow-arrival ; scroll: parallax-bg, mask-reveal, clip-reveal, stagger-list, count-up ; text: typewriter, gradient-flow, neon-glow, fire-text ; card: card-tilt-3d, magic-card, holographic ; transition: zoom-fade, blur-fade, push-pull. Choisis l'effet adapté à chaque bloc.
- Délai (effectDelay en ms) : 0 pour le premier bloc visible, +100ms par bloc successif
- Pour parallax-hero : remplis title (court, fort), subtitle (1 phrase), ctaLabel, ctaHref (/contact ou /about), bgImage (URL de la 1ère image fournie), floatingText (un mot évocateur en MAJUSCULES), height "90vh"
- Pour parallax-slider : 3-4 slides avec title (1 mot), subtitle (3-5 mots), tagline ("01 / 03"), image (URL), accentColor (#d946ef ou #06b6d4 ou #f59e0b ou #10b981)
- Width : la plupart full, quelques images en 1/2 ou 1/3 pour varier
- Le contenu doit être bilingue-ready FR mais en français pour l'instant
- Sois créatif, mais cohérent avec le thème

Réponds UNIQUEMENT avec le JSON, pas de markdown, pas d'explications.`;

  const result = await callGeminiText({
    apiKey,
    prompt: fullPrompt,
    model: GEMINI_MODELS.CHAT,
    temperature: 0.85,
    maxOutputTokens: 6000,
    jsonMode: true,
    jsonSchema: schema,
    timeoutMs: 50_000
  });

  if (!result || !result.text) {
    return NextResponse.json({ error: 'gemini-no-response' }, { status: 500 });
  }

  let parsed: any;
  try {
    parsed = JSON.parse(result.text);
  } catch (e) {
    return NextResponse.json({ error: 'gemini-invalid-json', raw: result.text.slice(0, 500) }, { status: 500 });
  }

  if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
    return NextResponse.json({ error: 'no-blocks-generated', parsed }, { status: 500 });
  }

  // Si dryRun, on retourne juste l'apperçu sans sauvegarder
  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, pageTitle: parsed.pageTitle, blocks: parsed.blocks });
  }

  // Sauvegarde
  if (mode === 'replace') {
    await (prisma as any).pageBlock.deleteMany({ where: { pageSlug: slug } });
  }
  const existing = await (prisma as any).pageBlock.count({ where: { pageSlug: slug } });
  let created = 0;
  for (let i = 0; i < parsed.blocks.length; i++) {
    const b = parsed.blocks[i];
    try {
      await (prisma as any).pageBlock.create({
        data: {
          pageSlug: slug,
          position: existing + i,
          width: b.width || 'full',
          height: 'auto',
          type: b.type,
          data: b.data || {},
          effect: b.effect || null,
          effectDelay: typeof b.effectDelay === 'number' ? b.effectDelay : i * 100,
          visible: true
        }
      });
      created++;
    } catch (e: any) {
      console.error('block-create-error', i, e?.message);
    }
  }

  return NextResponse.json({
    ok: true,
    pageTitle: parsed.pageTitle,
    slug,
    mode,
    blocksCount: created,
    blocks: parsed.blocks
  });
}
