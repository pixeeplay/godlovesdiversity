import { trackAiUsage, assertAiQuota } from './tracking';
import { generateText } from './gemini-text';
import type { AiCallContext } from './types';

/**
 * Génère un prompt vidéo optimisé pour Veo 3 / Runway / Sora.
 */
export async function generateVideoPrompt(ctx: AiCallContext, userPrompt: string): Promise<string> {
  const enhanced = await generateText(
    ctx,
    `Crée un PROMPT TEXTE optimisé pour Veo 3 / Runway Gen-3 / Sora pour générer une vidéo de 5-8 secondes basée sur : ${userPrompt}. Format paysage 16:9. Mouvement caméra lent (dolly, pan, push-in). Décris la scène, l'éclairage, le rythme, la palette. Réponds en anglais, max 80 mots, 1 paragraphe.`,
    { temperature: 0.7, maxOutputTokens: 200 }
  );
  return enhanced.trim();
}

/**
 * Génère une vidéo via fal.ai Seedance v1 lite.
 * Coût ≈ 30 cents par vidéo 5s.
 */
export async function generateVideo(
  ctx: AiCallContext,
  prompt: string,
  opts: { aspectRatio?: '16:9' | '9:16'; duration?: number } = {}
): Promise<{ videoUrl?: string; queueId?: string }> {
  await assertAiQuota(ctx.orgId, 30);
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error('FAL_KEY required for video generation');
  const startedAt = Date.now();

  try {
    const r = await fetch('https://queue.fal.run/fal-ai/bytedance/seedance/v1/lite/text-to-video', {
      method: 'POST',
      headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        aspect_ratio: opts.aspectRatio || '16:9',
        duration: String(opts.duration || 5),
      }),
      signal: AbortSignal.timeout(110_000),
    });
    const j: any = await r.json();
    const videoUrl = j?.video?.url || j?.url;
    const queueId = j?.request_id || j?.id;
    await trackAiUsage(ctx, 'fal', 'seedance-v1-lite', 'video', {
      success: !!(videoUrl || queueId),
      durationMs: Date.now() - startedAt,
      videoSeconds: opts.duration || 5,
      costCents: 30,
    });
    return { videoUrl, queueId };
  } catch (err: any) {
    await trackAiUsage(ctx, 'fal', 'seedance-v1-lite', 'video', {
      success: false,
      durationMs: Date.now() - startedAt,
      errorMessage: err?.message?.slice(0, 200),
    });
    throw err;
  }
}
