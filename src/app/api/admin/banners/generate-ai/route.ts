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

/** Récupère et formatte les clés Higgsfield. Retourne null si manquantes. */
async function getHiggsfieldHeaders(): Promise<Record<string, string> | { error: string }> {
  const [idSetting, secretSetting, legacySetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'ai.higgsfieldKeyId' } }).catch(() => null),
    prisma.setting.findUnique({ where: { key: 'ai.higgsfieldSecret' } }).catch(() => null),
    prisma.setting.findUnique({ where: { key: 'ai.higgsfieldApiKey' } }).catch(() => null),
  ]);
  const keyId = idSetting?.value || process.env.HIGGSFIELD_KEY_ID;
  const secret = secretSetting?.value || process.env.HIGGSFIELD_SECRET;
  const legacyKey = legacySetting?.value || process.env.HIGGSFIELD_API_KEY;
  if (!keyId && !legacyKey) return { error: 'Higgsfield non configuré (manque API Key ID + Secret dans /admin/settings)' };
  if (keyId && !secret) return { error: 'Higgsfield : API Key Secret manquant — ajoute-le dans /admin/settings' };
  const h: Record<string, string> = {};
  if (keyId && secret) {
    h['hf-api-key'] = keyId;
    h['hf-secret'] = secret;
  } else if (legacyKey) {
    h['Authorization'] = `Bearer ${legacyKey}`;
  }
  return h;
}

/** Génère 1 à 4 images via Higgsfield Soul (text-to-image). */
async function tryHiggsfieldImage(prompt: string, count: number): Promise<any> {
  const headersOrErr = await getHiggsfieldHeaders();
  if ('error' in headersOrErr) return { ok: false, reason: headersOrErr.error };

  // Lance N requêtes parallèles (Higgsfield Soul génère 1 image/appel)
  const tasks = Array.from({ length: count }).map(async () => {
    const r = await fetch('https://api.higgsfield.ai/v1/text2image', {
      method: 'POST',
      headers: { ...headersOrErr, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        aspect_ratio: '16:9',
        model: 'soul'
      })
    });
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error?.message || `HTTP ${r.status}`);

    // 2 cas : image_url direct ou job_id à poller
    if (j.image_url) {
      const imgR = await fetch(j.image_url);
      const buf = Buffer.from(await imgR.arrayBuffer());
      return { data: buf.toString('base64'), mimeType: imgR.headers.get('content-type') || 'image/png' };
    }
    if (j.image_b64) {
      return { data: j.image_b64, mimeType: j.mime_type || 'image/png' };
    }
    if (j.job_id) {
      for (let i = 0; i < 30; i++) {
        await new Promise((res) => setTimeout(res, 3000));
        const poll = await fetch(`https://api.higgsfield.ai/v1/jobs/${j.job_id}`, { headers: headersOrErr });
        const pj = await poll.json();
        if (pj.status === 'completed' && pj.image_url) {
          const imgR = await fetch(pj.image_url);
          const buf = Buffer.from(await imgR.arrayBuffer());
          return { data: buf.toString('base64'), mimeType: imgR.headers.get('content-type') || 'image/png' };
        }
        if (pj.status === 'failed') throw new Error(pj.error || 'Higgsfield image job failed');
      }
      throw new Error('Higgsfield timeout image (90s)');
    }
    throw new Error('Réponse Higgsfield image inattendue');
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
  const headersOrErr = await getHiggsfieldHeaders();
  if ('error' in headersOrErr) return { ok: false, reason: headersOrErr.error };

  const model = opts.model || 'higgsfield-lite';
  const isStandard = model === 'higgsfield-standard';
  const duration = Math.max(3, Math.min(isStandard ? 10 : 5, opts.duration || 5));
  const motion = opts.motion || 'medium';
  const loop = opts.loop !== false;

  try {
    const r = await fetch('https://api.higgsfield.ai/v1/generate', {
      method: 'POST',
      headers: { ...headersOrErr, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        duration,
        aspect_ratio: '16:9',
        model,
        motion_intensity: motion,
        loop
      })
    });
    const j = await r.json();
    if (!r.ok || j.error) return { ok: false, reason: j.error?.message || `HTTP ${r.status}` };

    if (j.video_url) {
      return { ok: true, kind: 'video', videoUrl: j.video_url, prompt };
    }
    if (j.job_id) {
      for (let i = 0; i < 30; i++) {
        await new Promise(res => setTimeout(res, 5000));
        const poll = await fetch(`https://api.higgsfield.ai/v1/jobs/${j.job_id}`, {
          headers: headersOrErr
        });
        const pj = await poll.json();
        if (pj.status === 'completed' && pj.video_url) {
          return { ok: true, kind: 'video', videoUrl: pj.video_url, prompt };
        }
        if (pj.status === 'failed') return { ok: false, reason: pj.error || 'Higgsfield job failed' };
      }
      return { ok: false, reason: 'Higgsfield timeout après 150s' };
    }
    return { ok: false, reason: 'Réponse Higgsfield inattendue' };
  } catch (e: any) {
    return { ok: false, reason: `Higgsfield: ${e.message}` };
  }
}
