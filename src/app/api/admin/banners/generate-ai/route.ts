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

const PRESETS: Record<string, { prompt: string; ratio: '16:9' | '21:9' | '4:3' }> = {
  pride: {
    prompt: 'Cinematic ultra wide banner: vibrant rainbow flag waving in slow motion in front of a majestic gothic cathedral, golden hour light, photorealistic, dynamic, hopeful, 8K, hyperdetailed',
    ratio: '21:9'
  },
  noel: {
    prompt: 'Cinematic ultra wide banner: candle-lit cathedral interior at Christmas with pine garlands and gentle snowfall outside, warm gold and red, peaceful, photorealistic, hopeful',
    ratio: '21:9'
  },
  paques: {
    prompt: 'Cinematic ultra wide banner: spring cathedral with stained glass casting pastel rainbow light on lilies and tulips, soft morning sun, photorealistic, joyful resurrection',
    ratio: '21:9'
  },
  halloween: {
    prompt: 'Cinematic ultra wide banner: gothic cathedral at twilight with floating purple and orange lights, mystical atmosphere, photorealistic, theatrical',
    ratio: '21:9'
  },
  valentin: {
    prompt: 'Cinematic ultra wide banner: chapel filled with rose petals raining slowly, soft pink and red light, two gold rings on altar, photorealistic, romantic',
    ratio: '21:9'
  },
  ramadan: {
    prompt: 'Cinematic ultra wide banner: ornate mosque interior at dusk with crescent moon and lit lanterns, warm green and gold, peaceful, photorealistic',
    ratio: '21:9'
  },
  pessah: {
    prompt: 'Cinematic ultra wide banner: synagogue at sunset with menorah and white linen, soft blue and white light, photorealistic, solemn celebration',
    ratio: '21:9'
  },
  diwali: {
    prompt: 'Cinematic ultra wide banner: Hindu temple at night covered in oil lamps (diyas), warm orange and pink light, marigold petals floating, photorealistic, joyful',
    ratio: '21:9'
  },
  inclusivite: {
    prompt: 'Cinematic ultra wide banner: diverse group of people of all genders, ethnicities, ages holding hands inside a cathedral with rainbow stained glass, hopeful, photorealistic',
    ratio: '21:9'
  },
  agenda: {
    prompt: 'Cinematic ultra wide banner: vibrant outdoor LGBT-friendly event with flags, music, diverse crowd celebrating, golden hour, dynamic, photorealistic',
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

    // kind === 'image' : Higgsfield Soul (text-to-image)
    const result = await tryHiggsfieldImage(usedPrompt, Math.min(count, 4));
    if (result.ok) return NextResponse.json(result);
    return NextResponse.json({
      error: `Génération image Higgsfield échouée :\n\n${result.reason}\n\n→ Vérifie tes clés Higgsfield dans /admin/settings → 🎬 Higgsfield (API Key ID + Secret).`
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
