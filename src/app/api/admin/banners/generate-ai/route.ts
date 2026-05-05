import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/banners/generate-ai
 * Body : { preset?: string, prompt?: string, kind: 'image' | 'video', count?: number }
 *
 * Génère une image (Gemini Imagen) ou une vidéo (Veo si dispo) pour bannière hero.
 * Retourne base64 + mimeType pour preview, l'admin clique "Sauver" → upload + create Banner.
 *
 * NB : Veo n'est pas encore largement dispo via l'API publique Gemini en mai 2026.
 * On essaye, et on fallback sur image sinon.
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
    const { preset, prompt, kind = 'image', count = 1 } = await req.json();
    const usedPrompt = prompt || (preset && PRESETS[preset]?.prompt) || 'cinematic ultra wide banner, inclusive cathedral with rainbow light, photorealistic';

    if (kind === 'video') {
      // Tente Veo via Gemini si disponible
      const result = await tryGenerateVeo(usedPrompt);
      if (result.ok) return NextResponse.json(result);
      // Fallback : on génère l'image et on signale que la vidéo n'est pas dispo
      const img = await generateImagen(usedPrompt, 1);
      return NextResponse.json({
        ok: true,
        kind: 'image',
        fallbackFromVideo: true,
        message: 'Veo (vidéo IA) pas encore disponible sur ta clé Gemini — image générée à la place. Tu peux animer manuellement avec After Effects ou Runway.',
        images: img.images,
        prompt: usedPrompt
      });
    }

    const img = await generateImagen(usedPrompt, Math.min(count, 4));
    return NextResponse.json({ ok: true, kind: 'image', ...img, prompt: usedPrompt });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

async function generateImagen(prompt: string, count: number): Promise<{ images: { data: string; mimeType: string }[] }> {
  const setting = await prisma.setting.findUnique({ where: { key: 'ai.geminiApiKey' } }).catch(() => null);
  const apiKey = setting?.value || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Clé Gemini non configurée');

  // Imagen 3 via Gemini API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: count,
      aspectRatio: '16:9',
      personGeneration: 'allow_adult',
      safetySetting: 'block_few'
    }
  };

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error?.message || 'Imagen API error');

  const images = (j.predictions || []).map((p: any) => ({
    data: p.bytesBase64Encoded,
    mimeType: p.mimeType || 'image/png'
  }));
  return { images };
}

async function tryGenerateVeo(prompt: string): Promise<any> {
  // Veo n'est pas encore largement dispo via Gemini API publique en 2026.
  // Stub : retourne échec immédiat pour que le fallback image s'active.
  return { ok: false, reason: 'Veo non disponible via cette clé Gemini' };
}
