import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/admin/page-builder/generate-media
 * Body: {
 *   kind: 'image' | 'parallax-bg' | 'parallax-mid' | 'parallax-fg' | 'video-prompt' | 'video',
 *   prompt: string,
 *   aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3',
 *   count?: 1-4
 * }
 *
 * Génère :
 *  - kind=image           → Imagen 3 photo classique
 *  - kind=parallax-bg     → image plein cadre 16:9 ambiance, profondeur
 *  - kind=parallax-mid    → PNG transparent d'éléments milieu (collines, nuages)
 *  - kind=parallax-fg     → PNG transparent foreground (silhouettes, herbes)
 *  - kind=video-prompt    → texte de prompt vidéo (utilisable Veo/Sora/Runway)
 *  - kind=video           → vidéo via fal.ai si FAL_KEY configurée, sinon prompt seul
 *
 * Retourne : { ok, images?: string[] (data: URLs), videoUrl?: string, prompt?: string }
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const kind = (body.kind as string) || 'image';
  const userPrompt = (body.prompt as string)?.trim();
  if (!userPrompt) return NextResponse.json({ error: 'prompt-required' }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey && !kind.startsWith('video')) {
    return NextResponse.json({ error: 'gemini-api-key-missing' }, { status: 500 });
  }

  // Adapte le prompt selon le type de layer
  const promptByKind: Record<string, string> = {
    image: `Photographie cinématique, lumière douce, profondeur de champ. ${userPrompt}. Pas de texte sur l'image. Format paysage 16:9. Couleurs riches.`,
    'parallax-bg': `Photographie ultra-large 16:9 pour fond de hero parallax. Sujet en arrière-plan lointain, beaucoup d'espace ciel et profondeur, sans personnage au premier plan. Lumière golden hour, brume légère, palette violet/rose/cyan. ${userPrompt}. Pas de texte. Composition vide au centre pour laisser place au titre.`,
    'parallax-mid': `${userPrompt}. PNG TRANSPARENT, fond entièrement transparent (alpha = 0), élément middle-ground type colline, nuage, montagne ou structure isolée, sans contexte autour. Format 16:9. Eclairage doux. Aucun texte. Bordures soignées prêtes pour superposition.`,
    'parallax-fg': `${userPrompt}. PNG TRANSPARENT, fond entièrement transparent, élément foreground proche du spectateur (silhouettes, herbes hautes, branches, rebord, clôture), positionné en bas du cadre 16:9, occupant 30-40% de la hauteur en bas. Eclairage qui suggère la profondeur. Aucun texte.`,
    'video-prompt': `Crée un PROMPT TEXTE optimisé pour Veo 3 / Runway Gen-3 / Sora pour générer une vidéo de 5-8 secondes basée sur : ${userPrompt}. Format paysage 16:9. Mouvement caméra lent (dolly, pan, push-in). Décris la scène, l'éclairage, le rythme, la palette. Réponds en anglais, max 80 mots, 1 paragraphe sans markdown.`,
    video: userPrompt
  };
  const finalPrompt = promptByKind[kind] || userPrompt;
  const aspectRatio = body.aspectRatio || '16:9';
  const count = Math.min(4, Math.max(1, body.count || 1));

  // ─── Mode video-prompt : juste appeler Gemini text ──
  if (kind === 'video-prompt') {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: finalPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
        }),
        signal: AbortSignal.timeout(30_000)
      }
    );
    if (!r.ok) return NextResponse.json({ error: 'gemini-error', status: r.status }, { status: 500 });
    const j: any = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return NextResponse.json({ ok: true, prompt: text.trim() });
  }

  // ─── Mode video (fal.ai si configuré, sinon erreur) ──
  if (kind === 'video') {
    const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
    if (!falKey) {
      return NextResponse.json({
        error: 'fal-api-key-missing',
        hint: 'Configure FAL_KEY dans /admin/secrets pour activer la génération vidéo. En attendant, utilise kind=video-prompt pour avoir un prompt à coller dans Veo/Runway.'
      }, { status: 501 });
    }
    // Appel fal.ai Seedance ou similar
    try {
      const r = await fetch('https://queue.fal.run/fal-ai/bytedance/seedance/v1/lite/text-to-video', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          aspect_ratio: aspectRatio === '16:9' ? '16:9' : '9:16',
          duration: '5'
        }),
        signal: AbortSignal.timeout(110_000)
      });
      if (!r.ok) {
        const err = await r.text();
        return NextResponse.json({ error: 'fal-error', detail: err.slice(0, 300) }, { status: 500 });
      }
      const j: any = await r.json();
      // fal.ai retourne un request_id, il faut polling — pour l'instant on retourne juste l'URL si dispo
      const videoUrl = j?.video?.url || j?.url;
      if (videoUrl) {
        return NextResponse.json({ ok: true, videoUrl, prompt: finalPrompt });
      }
      return NextResponse.json({
        ok: true,
        queueId: j?.request_id || j?.id,
        message: 'Vidéo en file d\'attente fal.ai. Polling pas encore implémenté — utilise dashboard fal.ai pour récupérer.',
        prompt: finalPrompt
      });
    } catch (e: any) {
      return NextResponse.json({ error: 'fal-network', message: e?.message }, { status: 500 });
    }
  }

  // ─── Mode image (default + parallax-bg/mid/fg) ──
  const images: string[] = [];
  for (let i = 0; i < count; i++) {
    try {
      // Imagen 3
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: finalPrompt }],
            parameters: { sampleCount: 1, aspectRatio }
          }),
          signal: AbortSignal.timeout(50_000)
        }
      );
      if (r.ok) {
        const j: any = await r.json();
        const b64 = j?.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          images.push(`data:image/png;base64,${b64}`);
          continue;
        }
      }
      // Fallback Gemini 2.5 Flash Image
      const r2 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: finalPrompt }] }],
            generationConfig: { responseModalities: ['IMAGE'] }
          }),
          signal: AbortSignal.timeout(50_000)
        }
      );
      if (r2.ok) {
        const j2: any = await r2.json();
        const part = j2?.candidates?.[0]?.content?.parts?.find((pp: any) => pp.inlineData);
        if (part?.inlineData?.data) {
          images.push(`data:image/png;base64,${part.inlineData.data}`);
        }
      }
    } catch {}
  }

  if (images.length === 0) {
    return NextResponse.json({ error: 'image-generation-failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, images, kind, aspectRatio });
}
