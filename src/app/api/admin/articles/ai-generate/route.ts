import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/articles/ai-generate
 * Body : { mode: 'html' | 'image' | 'video-prompt', title, excerpt?, context?, count? }
 *
 * - mode='html'         → texte HTML formaté pour le body de l'article
 * - mode='image'        → URL d'une image générée (Gemini Imagen). Si count>1, retourne plusieurs.
 * - mode='video-prompt' → prompt textuel pour générateur vidéo (Seedance/Veo/Runway)
 */

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) return null;
  return s;
}

export async function POST(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const mode = body.mode as 'html' | 'image' | 'video-prompt';
  const title = (body.title as string)?.trim() || 'Inclusion religieuse LGBT+';
  const excerpt = (body.excerpt as string)?.trim() || '';
  const context = (body.context as string)?.trim() || '';
  const count = Math.min(4, Math.max(1, Number(body.count) || 1));

  const apiKey = await getSecret('GEMINI_API_KEY');
  if (!apiKey) {
    return NextResponse.json({
      error: 'gemini-key-missing',
      message: 'Configure GEMINI_API_KEY dans /admin/secrets ou Coolify env vars.'
    }, { status: 500 });
  }

  try {
    if (mode === 'html') {
      const html = await generateHtml(apiKey, { title, excerpt, context });
      return NextResponse.json({ ok: true, html });
    }
    if (mode === 'image') {
      const images = await generateImages(apiKey, { title, excerpt, context, count });
      return NextResponse.json({ ok: true, images });
    }
    if (mode === 'video-prompt') {
      const prompt = await generateVideoPrompt(apiKey, { title, excerpt, context });
      return NextResponse.json({ ok: true, videoPrompt: prompt });
    }
    return NextResponse.json({ error: 'invalid-mode' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'KO' }, { status: 500 });
  }
}

/* ─── HTML article ─────────────────────────────────────────────── */
async function generateHtml(apiKey: string, p: { title: string; excerpt: string; context: string }): Promise<string> {
  const prompt = `Rédige un article HTML pour le site God Loves Diversity (GLD) — mouvement interreligieux LGBT+ inclusif.

Titre : ${p.title}
${p.excerpt ? `Chapeau : ${p.excerpt}` : ''}
${p.context ? `Contexte : ${p.context}` : ''}

Format de sortie : HTML uniquement (pas de markdown, pas de balises <html>, <head>, <body>). Structure :
  <h2>Sous-titre accrocheur</h2>
  <p>Paragraphe d'intro avec le contexte historique/spirituel.</p>
  <h3>Section 1</h3>
  <p>...</p>
  <h3>Section 2</h3>
  <p>...</p>
  <blockquote>Une citation forte ou un témoignage si pertinent.</blockquote>
  <p>Conclusion qui ouvre vers une action ou une réflexion.</p>

Ton : chaleureux, apaisé, respectueux des traditions, inclusif sans militantisme outrancier. Longueur ~ 350-450 mots.
Langue : français.
Réponds UNIQUEMENT avec le HTML, pas de markdown autour, pas d'explication.`;

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      }),
      signal: AbortSignal.timeout(40_000)
    }
  );
  if (!r.ok) throw new Error(`gemini-html-${r.status}`);
  const j: any = await r.json();
  let html = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  // Cleanup : retire les ```html et ``` éventuels
  html = html.replace(/^```html?\s*/i, '').replace(/```\s*$/i, '').trim();
  return html;
}

/* ─── Images (Gemini Imagen ou flash multimodal) ─────────────── */
async function generateImages(apiKey: string, p: { title: string; excerpt: string; context: string; count: number }): Promise<string[]> {
  const imagePrompt = `Photographie éditoriale pour un article GLD (God Loves Diversity, mouvement interreligieux LGBT+).
Sujet : ${p.title}
${p.excerpt ? `Description : ${p.excerpt}` : ''}
${p.context ? `Contexte : ${p.context}` : ''}

Style : photo cinématique, lumière douce dorée golden hour, profondeur de champ, ambiance chaleureuse et apaisée, palette violet/rose/orange/cyan. Pas de texte sur l'image. Format paysage 16:9.`;

  const images: string[] = [];

  // Gemini 2.5 Flash Image generation API (Imagen 3 via Gemini)
  for (let i = 0; i < p.count; i++) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: imagePrompt }],
            parameters: { sampleCount: 1, aspectRatio: '16:9' }
          }),
          signal: AbortSignal.timeout(45_000)
        }
      );

      if (r.ok) {
        const j: any = await r.json();
        const b64 = j?.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          // Stocke en data: URL pour l'instant — plus tard on pourra upload sur MinIO
          images.push(`data:image/png;base64,${b64}`);
          continue;
        }
      }

      // Fallback : essaie Gemini 2.5 Flash Image (modèle multimodal qui peut générer des images)
      const r2 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: imagePrompt }] }],
            generationConfig: { responseModalities: ['IMAGE'] }
          }),
          signal: AbortSignal.timeout(45_000)
        }
      );
      if (r2.ok) {
        const j2: any = await r2.json();
        const part = j2?.candidates?.[0]?.content?.parts?.find((pp: any) => pp.inlineData);
        if (part?.inlineData?.data) {
          images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
        }
      }
    } catch (e) {
      // skip silently for this iteration, garde celles déjà générées
    }
  }

  if (images.length === 0) {
    throw new Error('Aucune image générée — vérifie ta clé Gemini ou réessaie.');
  }

  return images;
}

/* ─── Video prompt (texte uniquement) ────────────────────────── */
async function generateVideoPrompt(apiKey: string, p: { title: string; excerpt: string; context: string }): Promise<string> {
  const prompt = `Rédige un prompt cinématographique optimisé pour un générateur vidéo IA (Seedance / Veo / Runway).
L'article GLD aborde : ${p.title}
${p.excerpt ? `Chapeau : ${p.excerpt}` : ''}
${p.context ? `Contexte : ${p.context}` : ''}

Format requis :
  Subject: [sujet principal de la scène]
  Setting: [décor, lieu]
  Action: [ce qui se passe en 5 secondes]
  Style: [esthétique visuelle — cinéma, doc, animation, etc.]
  Camera: [type de plan, mouvement caméra]
  Lighting: [éclairage]
  Color palette: [palette]
  Mood: [émotion souhaitée]
  Duration: 5-8 seconds

Ton : inspirant, lumineux, inclusif. Pas de violence, pas de symboles religieux trop explicites mais des évocations spirituelles douces.
Réponds UNIQUEMENT avec le prompt structuré (pas de markdown, pas de bloc code).`;

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 800 }
      }),
      signal: AbortSignal.timeout(30_000)
    }
  );
  if (!r.ok) throw new Error(`gemini-video-${r.status}`);
  const j: any = await r.json();
  return (j?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
}
