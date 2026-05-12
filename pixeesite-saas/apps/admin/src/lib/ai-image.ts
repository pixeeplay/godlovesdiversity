import { getOrgSecret } from './secrets';

/**
 * AI image generation helper with cache + provider fallbacks.
 *
 * Order :
 *   1. Cache via Asset(tenantDb) keyed by sha1(prompt) → reuse URL if present.
 *   2. fal-ai/flux/schnell (or flux-pro) if FAL_KEY available on the org.
 *   3. Unsplash source URL as last resort (no key required).
 *
 * Cache is **opt-in**: pass `tenantDb` to store/lookup Assets. Without it, generation
 * runs every time but still returns a URL.
 */

import { createHash } from 'crypto';

export interface AiImageOpts {
  orgId: string;
  /** Free-form prompt (will be enriched with photography keywords). */
  prompt: string;
  /** Image size keyword for FAL (default: landscape_16_9). */
  size?: 'landscape_16_9' | 'landscape_4_3' | 'square' | 'portrait_4_3' | 'portrait_16_9';
  /** Unsplash fallback keywords. If empty we re-use main prompt words. */
  unsplashKeywords?: string;
  /** Optional model preference. */
  model?: 'fal-ai/flux/schnell' | 'fal-ai/flux-pro' | 'fal-ai/flux/dev';
  /** Tenant Prisma client for cache (Asset model). Optional. */
  tenantDb?: any;
  /** Signature for Unsplash variant (different seed = different photo). */
  seed?: number | string;
}

export interface AiImageResult {
  url: string | null;
  source: 'cache' | 'flux' | 'unsplash' | 'none';
  prompt: string;
}

/** SHA1 short key used as cache lookup. */
function keyFor(prompt: string, size: string): string {
  return createHash('sha1').update(`${prompt}::${size}`).digest('hex').slice(0, 24);
}

/** Strip non-word chars and pick top 4 keywords for Unsplash. */
export function extractKeywords(text: string, max = 4): string {
  if (!text) return 'design';
  const STOP = new Set([
    'avec', 'pour', 'dans', 'plus', 'cette', 'cela', 'mais', 'aussi', 'tout', 'tous',
    'votre', 'notre', 'leurs', 'leur', 'sont', 'sera', 'sans', 'depuis', 'after',
    'with', 'from', 'this', 'that', 'have', 'will', 'your', 'their', 'they',
    'site', 'page', 'section', 'hero', 'image',
  ]);
  const words = (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  // de-dup
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= max) break;
  }
  return out.join(',') || 'design';
}

/**
 * Generate (or retrieve from cache) an image URL.
 * Never throws — always returns AiImageResult.
 */
export async function generateAiImage(opts: AiImageOpts): Promise<AiImageResult> {
  const prompt = (opts.prompt || '').trim();
  const size = opts.size || 'landscape_16_9';
  const cacheKey = keyFor(prompt, size);

  // 1. Cache lookup via Asset.aiPrompt (we store the cacheKey as alt)
  if (opts.tenantDb) {
    try {
      const hit = await opts.tenantDb.asset.findFirst({
        where: { aiGenerated: true, alt: cacheKey },
        select: { url: true },
      });
      if (hit?.url) return { url: hit.url, source: 'cache', prompt };
    } catch {
      // ignore
    }
  }

  let outUrl: string | null = null;
  let source: AiImageResult['source'] = 'none';

  // 2. FAL Flux
  try {
    const falKey = await getOrgSecret(opts.orgId, 'FAL_KEY');
    if (falKey && prompt) {
      const model = opts.model || 'fal-ai/flux/schnell';
      const enriched = `${prompt}, cinematic photography, editorial, soft natural light, ultra detailed, no text, no logo, no watermark`;
      const r = await fetch(`https://fal.run/${model}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Key ${falKey}` },
        body: JSON.stringify({ prompt: enriched, image_size: size, num_inference_steps: 4 }),
      });
      if (r.ok) {
        const j: any = await r.json().catch(() => ({}));
        outUrl = j?.images?.[0]?.url || j?.image?.url || null;
        if (outUrl) source = 'flux';
      }
    }
  } catch {
    // ignore
  }

  // 3. Unsplash fallback (no key needed)
  if (!outUrl) {
    const kw = opts.unsplashKeywords || extractKeywords(prompt);
    const seed = opts.seed != null ? `&sig=${encodeURIComponent(String(opts.seed))}` : '';
    const dims = size.startsWith('portrait') ? '900x1600'
      : size === 'square' ? '1200x1200'
      : '1600x900';
    outUrl = `https://source.unsplash.com/${dims}/?${encodeURIComponent(kw)}${seed}`;
    source = 'unsplash';
  }

  // 4. Persist in cache
  if (outUrl && opts.tenantDb) {
    try {
      await opts.tenantDb.asset.create({
        data: {
          bucket: 'ai-cache',
          key: `ai/${cacheKey}.jpg`,
          url: outUrl,
          filename: `${cacheKey}.jpg`,
          mimeType: 'image/jpeg',
          sizeBytes: 0,
          alt: cacheKey, // used as lookup key
          aiGenerated: true,
          aiPrompt: prompt.slice(0, 2000),
          folder: 'ai-wizard',
          tags: ['wizard', source],
        },
      });
    } catch {
      // ignore — caching is best-effort
    }
  }

  return { url: outUrl, source, prompt };
}

/**
 * Bulk helper : generate N images for a parallax-slider or gallery in parallel.
 * Each image gets a unique seed/index for variety.
 */
export async function generateAiImageBatch(
  base: Omit<AiImageOpts, 'seed'>,
  count: number,
): Promise<string[]> {
  const tasks = Array.from({ length: count }, (_, i) =>
    generateAiImage({ ...base, seed: i + 1 }).then((r) => r.url || ''),
  );
  const results = await Promise.all(tasks);
  return results.filter(Boolean);
}

/**
 * Logo generation — Flux with "minimal logo design" prompt, or Unsplash icon fallback.
 */
export async function generateLogoImage(orgId: string, businessName: string, brief: string): Promise<string | null> {
  const res = await generateAiImage({
    orgId,
    prompt: `minimal modern logo design for "${businessName}", ${brief}, vector style, flat, monogram, centered on plain white background`,
    size: 'square',
    model: 'fal-ai/flux/schnell',
  });
  return res.url;
}
