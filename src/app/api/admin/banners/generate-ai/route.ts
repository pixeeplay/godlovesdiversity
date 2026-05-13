import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/banners/generate-ai
 * Body : {
 *   preset?: string, prompt?: string, kind: 'image' | 'video', count?: number,
 *   higgsfield?: { model: 'higgsfield-lite'|'higgsfield-standard'|'higgsfield-turbo', duration: number, motion: 'low'|'medium'|'high', loop: boolean }
 * }
 *
 * Génère une image (Gemini Imagen) ou une vidéo (Higgsfield AI) pour bannière hero.
 * Retourne base64 + mimeType pour preview, l'admin clique "Sauver" → upload + create Banner.
 *
 * Si Higgsfield n'est pas configuré (clés ID + Secret manquantes), fallback automatique
 * sur 4 images Imagen → carrousel hero (effet "vidéo" cinématique).
 */

// Prompts LGBT-aligned (le projet a pivoté de spirituel→queer, plus de cathédrales/mosquées)
const PRESETS: Record<string, { prompt: string; ratio: '16:9' | '21:9' | '4:3' }> = {
  pride: {
    prompt: 'Ultra-wide cinematic banner: massive Pride march in Paris with thousands of people holding rainbow flags, drag queens, dancers on parade floats, golden hour, neon pink and purple confetti, joyful diverse crowd, photorealistic, 8K, hopeful, dynamic motion',
    ratio: '21:9'
  },
  noel: {
    prompt: 'Ultra-wide cinematic banner: queer Christmas party with multicolored fairy lights, two femme partners decorating a tree together, vintage neon disco ball, warm pink and gold, photorealistic, cozy and inclusive',
    ratio: '21:9'
  },
  paques: {
    prompt: 'Ultra-wide cinematic banner: spring Pride picnic with rainbow Easter eggs and tulips, queer couples lying on grass, soft pastel morning sun, photorealistic, joyful, gentle',
    ratio: '21:9'
  },
  halloween: {
    prompt: 'Ultra-wide cinematic banner: drag queen Halloween ball, gothic glamour, neon purple and orange smoke, sequins, jack-o-lanterns, vintage queer cabaret aesthetic, photorealistic, theatrical, mysterious',
    ratio: '21:9'
  },
  valentin: {
    prompt: 'Ultra-wide cinematic banner: two LGBTQ+ couples sharing a tender moment (one couple femme/femme, one masc/masc), neon pink hearts, rose petals slow motion, soft cinematic light, photorealistic, romantic',
    ratio: '21:9'
  },
  ramadan: {
    prompt: 'Ultra-wide cinematic banner: queer Muslim friends sharing iftar dinner together, candle-lit terrace, crescent moon, warm green and gold, diverse LGBTQ+ community, photorealistic, peaceful, inclusive',
    ratio: '21:9'
  },
  pessah: {
    prompt: 'Ultra-wide cinematic banner: queer Jewish Seder table with rainbow kippot, diverse LGBTQ+ family laughing, soft blue and white candlelight, photorealistic, joyful celebration',
    ratio: '21:9'
  },
  diwali: {
    prompt: 'Ultra-wide cinematic banner: queer South Asian Diwali celebration with oil lamps (diyas), rainbow rangoli on the floor, dancers in vibrant saris and sherwanis, marigold petals floating, photorealistic, joyful',
    ratio: '21:9'
  },
  inclusivite: {
    prompt: 'Ultra-wide cinematic banner: diverse LGBTQ+ community of all ages, genders, ethnicities, body types, holding hands in front of a giant rainbow + trans flag + non-binary flag mural, photorealistic, hopeful, dignified',
    ratio: '21:9'
  },
  agenda: {
    prompt: 'Ultra-wide cinematic banner: vibrant outdoor LGBTQ+ event in Paris, drag performers on stage, dance floor, neon Pride flag light, diverse crowd celebrating, golden hour, dynamic, photorealistic',
    ratio: '21:9'
  }
};

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { preset, prompt, kind = 'image', count = 1, higgsfield: hfOpts } = await req.json();
    const usedPrompt = prompt || (preset && PRESETS[preset]?.prompt) || 'cinematic ultra wide banner, inclusive cathedral with rainbow light, photorealistic';

    if (kind === 'video') {
      const result = await tryHiggsfield(usedPrompt, hfOpts);
      if (result.ok) return NextResponse.json(result);
      return NextResponse.json({
        error: `Génération vidéo Higgsfield échouée :\n\n${result.reason}\n\n→ Vérifie tes clés Higgsfield dans /admin/settings → 🎬 Higgsfield (API Key ID + Secret).`
      }, { status: 503 });
    }

    // kind === 'image' : tente Higgsfield Soul, fallback sur Gemini Nano Banana si fal.ai pas configuré
    const result = await tryHiggsfieldImage(usedPrompt, Math.min(count, 4));
    if (result.ok) return NextResponse.json({ ...result, provider: 'higgsfield-soul' });

    // Fallback automatique sur Gemini Nano Banana (gemini-2.5-flash-image)
    const geminiResult = await tryGeminiNanoBanana(usedPrompt, Math.min(count, 4));
    if (geminiResult.ok) return NextResponse.json({ ...geminiResult, provider: 'gemini-nano-banana' });

    return NextResponse.json({
      error: `Génération image échouée :\n\nHiggsfield : ${result.reason}\nGemini Nano Banana : ${geminiResult.reason}\n\n→ Vérifie ta clé fal.ai dans /admin/settings (Higgsfield)\n   OU ta clé Gemini dans /admin/settings → integrations.gemini.apiKey`
    }, { status: 503 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

/** Récupère la clé fal.ai (qui héberge les modèles Higgsfield). */
async function getFalKey(): Promise<string | { error: string }> {
  const setting = await prisma.setting.findUnique({ where: { key: 'ai.falApiKey' } }).catch(() => null);
  const key = setting?.value || process.env.FAL_KEY;
  if (!key) return { error: 'fal.ai non configuré — ajoute ta clé dans /admin/settings → 🎬 Higgsfield via fal.ai (10$ offerts à l\'inscription sur fal.ai)' };
  return key;
}

/** Génère 1 à 4 images via fal.ai Higgsfield Soul. */
async function tryHiggsfieldImage(prompt: string, count: number): Promise<any> {
  const k = await getFalKey();
  if (typeof k !== 'string') return { ok: false, reason: k.error };

  // fal.ai endpoint : https://fal.run/fal-ai/higgsfield-soul
  // Auth: Authorization: Key <key>
  const tasks = Array.from({ length: count }).map(async () => {
    const r = await fetch('https://fal.run/fal-ai/higgsfield-soul', {
      method: 'POST',
      headers: { 'Authorization': `Key ${k}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspect_ratio: '16:9' })
    });
    const raw = await r.text();
    if (raw.trim().startsWith('<')) throw new Error(`fal.ai HTML reçu (HTTP ${r.status})`);
    const j = JSON.parse(raw);
    if (!r.ok || j.error) throw new Error(j.error?.message || j.detail || `HTTP ${r.status}`);
    const imageUrl = j.images?.[0]?.url || j.image?.url;
    if (!imageUrl) throw new Error('Pas d\'URL image dans la réponse fal.ai');
    const imgR = await fetch(imageUrl);
    const buf = Buffer.from(await imgR.arrayBuffer());
    return { data: buf.toString('base64'), mimeType: imgR.headers.get('content-type') || 'image/png' };
  });

  try {
    const images = await Promise.all(tasks);
    return { ok: true, kind: 'image', images, prompt };
  } catch (e: any) {
    return { ok: false, reason: e?.message || String(e) };
  }
}

type HiggsfieldOpts = {
  model?: 'higgsfield-lite' | 'higgsfield-standard' | 'higgsfield-turbo';
  duration?: number;
  motion?: 'low' | 'medium' | 'high';
  loop?: boolean;
};

async function tryHiggsfield(prompt: string, opts: HiggsfieldOpts = {}): Promise<any> {
  const k = await getFalKey();
  if (typeof k !== 'string') return { ok: false, reason: k.error };

  const model = opts.model || 'higgsfield-lite';
  const isStandard = model === 'higgsfield-standard';
  const duration = Math.max(3, Math.min(isStandard ? 10 : 5, opts.duration || 5));
  const motion = opts.motion || 'medium';
  const loop = opts.loop !== false;
  // Map vers les vrais slugs fal.ai
  const falEndpoint = isStandard ? 'higgsfield-dop' : 'higgsfield-lite';

  try {
    const r = await fetch(`https://fal.run/fal-ai/${falEndpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${k}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, duration, aspect_ratio: '16:9', motion_strength: motion, loop })
    });
    const raw = await r.text();
    if (raw.trim().startsWith('<')) {
      return { ok: false, reason: `fal.ai a renvoyé du HTML (HTTP ${r.status}). Vérifie ta clé fal.ai dans /admin/settings.` };
    }
    let j: any;
    try { j = JSON.parse(raw); } catch {
      return { ok: false, reason: `fal.ai : réponse non-JSON (HTTP ${r.status}) — "${raw.slice(0, 100)}"` };
    }
    if (!r.ok || j.error) {
      return { ok: false, reason: j.error?.message || j.detail || `HTTP ${r.status}` };
    }
    const videoUrl = j.video?.url || j.videos?.[0]?.url;
    if (videoUrl) return { ok: true, kind: 'video', videoUrl, prompt };
    return { ok: false, reason: 'Pas d\'URL vidéo dans la réponse fal.ai' };
  } catch (e: any) {
    return { ok: false, reason: `fal.ai : ${e?.message || e}` };
  }
}

/**
 * Génère des images via Google Gemini / Imagen.
 * Cascade de modèles : essaie chacun jusqu'à ce que ça marche.
 * - imagen-3.0-fast-generate-002 (Imagen 3 fast, via predict API)
 * - imagen-3.0-generate-002 (Imagen 3 standard)
 * - gemini-2.5-flash-image (Nano Banana, generateContent API)
 * - gemini-2.0-flash-exp (fallback experimental)
 */
async function tryGeminiNanoBanana(prompt: string, count: number): Promise<any> {
  const setting = await prisma.setting.findUnique({ where: { key: 'integrations.gemini.apiKey' } }).catch(() => null);
  const key = setting?.value || process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, reason: 'Clé Gemini manquante (integrations.gemini.apiKey)' };

  // Optional override : utilise GEMINI_IMAGE_MODEL si défini
  const envModel = process.env.GEMINI_IMAGE_MODEL;
  const modelsToTry: { name: string; api: 'predict' | 'generateContent' }[] = [
    ...(envModel ? [{ name: envModel, api: envModel.startsWith('imagen') ? 'predict' as const : 'generateContent' as const }] : []),
    { name: 'imagen-3.0-fast-generate-002', api: 'predict' },
    { name: 'imagen-3.0-generate-002', api: 'predict' },
    { name: 'gemini-2.5-flash-image', api: 'generateContent' },
    { name: 'gemini-2.0-flash-exp', api: 'generateContent' }
  ];

  const errors: string[] = [];

  for (const { name: model, api } of modelsToTry) {
    try {
      const tasks = Array.from({ length: count }).map(async () => {
        if (api === 'predict') {
          // Imagen API : POST /v1beta/models/<model>:predict
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                instances: [{ prompt }],
                parameters: { sampleCount: 1, aspectRatio: '16:9' }
              })
            }
          );
          if (!r.ok) {
            const t = await r.text().catch(() => '');
            throw new Error(`${model} HTTP ${r.status}: ${t.slice(0, 100)}`);
          }
          const j: any = await r.json();
          const pred = j?.predictions?.[0];
          const b64 = pred?.bytesBase64Encoded || pred?.image?.bytesBase64Encoded;
          if (!b64) throw new Error(`${model}: pas d'image dans predictions`);
          return { data: b64, mimeType: pred?.mimeType || 'image/png' };
        } else {
          // Gemini Image API : generateContent avec responseModalities IMAGE
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseModalities: ['IMAGE'], temperature: 0.9 }
              })
            }
          );
          if (!r.ok) {
            const t = await r.text().catch(() => '');
            throw new Error(`${model} HTTP ${r.status}: ${t.slice(0, 100)}`);
          }
          const j: any = await r.json();
          const parts = j?.candidates?.[0]?.content?.parts || [];
          const imagePart = parts.find((p: any) => p.inlineData?.data);
          if (!imagePart) throw new Error(`${model}: pas d'image dans la réponse`);
          return { data: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType || 'image/png' };
        }
      });
      const images = await Promise.all(tasks);
      return { ok: true, kind: 'image', images, prompt, modelUsed: model };
    } catch (e: any) {
      errors.push(e?.message || String(e));
      // Continue avec le prochain modèle
    }
  }

  return { ok: false, reason: 'Tous les modèles ont échoué :\n' + errors.join('\n').slice(0, 600) };
}
