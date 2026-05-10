import { trackAiUsage, assertAiQuota } from './tracking';
import type { AiCallContext } from './types';

/**
 * Génère une image via Imagen 3 (fallback Gemini Flash Image).
 * Coût ≈ 4 cents par image.
 */
export async function generateImage(
  ctx: AiCallContext,
  prompt: string,
  opts: { aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3'; count?: number } = {}
): Promise<string[]> {
  await assertAiQuota(ctx.orgId, (opts.count || 1) * 4);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY required');
  const startedAt = Date.now();
  const images: string[] = [];
  const count = opts.count || 1;
  const aspectRatio = opts.aspectRatio || '16:9';

  for (let i = 0; i < count; i++) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { sampleCount: 1, aspectRatio },
          }),
          signal: AbortSignal.timeout(50_000),
        }
      );
      if (r.ok) {
        const j: any = await r.json();
        const b64 = j?.predictions?.[0]?.bytesBase64Encoded;
        if (b64) images.push(`data:image/png;base64,${b64}`);
      }
    } catch (err) {
      // skip variant
    }
  }

  const success = images.length > 0;
  await trackAiUsage(ctx, 'imagen', 'imagen-3.0-generate-002', 'image', {
    success,
    durationMs: Date.now() - startedAt,
    imagesCount: images.length,
    costCents: images.length * 4,
    errorMessage: success ? undefined : 'imagen-failed',
  });

  if (!success) throw new Error('Image generation failed');
  return images;
}

/**
 * Génère un layer parallax (PNG transparent pour mid/fg, photo classique pour bg).
 */
export async function generateParallaxLayer(
  ctx: AiCallContext,
  layer: 'bg' | 'mid' | 'fg',
  userPrompt: string
): Promise<string> {
  const prompts: Record<typeof layer, string> = {
    bg: `Photographie ultra-large 16:9 pour fond de hero parallax. Sujet en arrière-plan lointain, beaucoup d'espace ciel et profondeur, sans personnage au premier plan. Lumière golden hour, brume légère. ${userPrompt}. Pas de texte. Composition vide au centre.`,
    mid: `${userPrompt}. PNG TRANSPARENT, fond entièrement transparent (alpha = 0), élément middle-ground type colline, nuage, montagne ou structure isolée, sans contexte autour. Format 16:9. Aucun texte.`,
    fg: `${userPrompt}. PNG TRANSPARENT, fond entièrement transparent, élément foreground proche du spectateur (silhouettes, herbes hautes, branches), positionné en bas du cadre 16:9, occupant 30-40% de la hauteur en bas. Aucun texte.`,
  };
  const images = await generateImage(ctx, prompts[layer], { aspectRatio: '16:9', count: 1 });
  return images[0];
}
