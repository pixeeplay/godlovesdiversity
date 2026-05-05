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
      // Tente Higgsfield avec les paramètres demandés
      const result = await tryHiggsfield(usedPrompt, hfOpts);
      if (result.ok) return NextResponse.json(result);
      // Fallback : 4 images Imagen → carrousel = effet vidéo
      try {
        const img = await generateImagen(usedPrompt, 4);
        return NextResponse.json({
          ok: true,
          kind: 'image',
          fallbackFromVideo: true,
          message: `⚠ Higgsfield non disponible : ${result.reason}\n\n✓ Fallback : 4 images Imagen générées — le carrousel hero les fera défiler automatiquement (effet "vidéo" cinématique).`,
          images: img.images,
          prompt: usedPrompt
        });
      } catch (imgErr: any) {
        // Ni Higgsfield ni Imagen ne marchent : message d'aide complet
        return NextResponse.json({
          error: `Aucune génération vidéo possible :\n\n• Higgsfield : ${result.reason}\n• Fallback Imagen : ${imgErr.message}\n\n→ Configure au moins l'un des deux dans /admin/settings :\n  - Higgsfield (vidéo réelle, recommandé) : API Key ID + Secret\n  - Gemini (fallback images carrousel) : Clé API`
        }, { status: 503 });
      }
    }

    try {
      const img = await generateImagen(usedPrompt, Math.min(count, 4));
      return NextResponse.json({ ok: true, kind: 'image', ...img, prompt: usedPrompt });
    } catch (imgErr: any) {
      return NextResponse.json({
        error: `Génération image impossible : ${imgErr.message}\n\n→ Configure ta clé Gemini dans /admin/settings → IA & Outils → Gemini.`
      }, { status: 503 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

async function generateImagen(prompt: string, count: number): Promise<{ images: { data: string; mimeType: string }[] }> {
  const setting = await prisma.setting.findUnique({ where: { key: 'ai.geminiApiKey' } }).catch(() => null);
  const apiKey = setting?.value || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Clé Gemini non configurée');

  // Cascade des modèles Imagen — du plus récent au plus ancien.
  // Le nom exact change selon l'API ; on essaie dans l'ordre jusqu'à ce qu'un marche.
  const candidates = [
    'imagen-4.0-generate-preview',
    'imagen-4.0-ultra-generate-preview',
    'imagen-3.0-generate-002',
    'imagen-3.0-fast-generate-001',
    'imagen-3.0-generate-001'
  ];
  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: count,
      aspectRatio: '16:9',
      personGeneration: 'allow_adult',
      safetySetting: 'block_few'
    }
  };

  let lastErr = '';
  for (const model of candidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (r.ok && !j.error) {
        const images = (j.predictions || []).map((p: any) => ({
          data: p.bytesBase64Encoded,
          mimeType: p.mimeType || 'image/png'
        }));
        if (images.length > 0) return { images };
        lastErr = `Modèle ${model} : pas d'image retournée`;
        continue;
      }
      lastErr = `${model} : ${j.error?.message || `HTTP ${r.status}`}`;
      // Si erreur "not found" / "not supported", on passe au suivant
      if (/not found|not supported|UNAVAILABLE|404/i.test(lastErr)) continue;
      // Autre erreur (quota, auth) → on stoppe (pas la peine de retry)
      throw new Error(lastErr);
    } catch (e: any) {
      lastErr = `${model} : ${e?.message || e}`;
      // Réseau / parse → essaie le suivant
      continue;
    }
  }
  throw new Error(`Aucun modèle Imagen disponible. Dernier essai : ${lastErr}\n\n→ Vérifie dans Google AI Studio (https://aistudio.google.com) que ta clé Gemini a bien Imagen activé (peut nécessiter un projet Google Cloud avec billing).`);
}

type HiggsfieldOpts = {
  model?: 'higgsfield-lite' | 'higgsfield-standard' | 'higgsfield-turbo';
  duration?: number;
  motion?: 'low' | 'medium' | 'high';
  loop?: boolean;
};

async function tryHiggsfield(prompt: string, opts: HiggsfieldOpts = {}): Promise<any> {
  // Higgsfield = 2 clés (API Key ID + API Key Secret) → headers hf-api-key + hf-secret
  const [idSetting, secretSetting, legacySetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'ai.higgsfieldKeyId' } }).catch(() => null),
    prisma.setting.findUnique({ where: { key: 'ai.higgsfieldSecret' } }).catch(() => null),
    prisma.setting.findUnique({ where: { key: 'ai.higgsfieldApiKey' } }).catch(() => null), // legacy
  ]);
  const keyId = idSetting?.value || process.env.HIGGSFIELD_KEY_ID;
  const secret = secretSetting?.value || process.env.HIGGSFIELD_SECRET;
  const legacyKey = legacySetting?.value || process.env.HIGGSFIELD_API_KEY;
  if (!keyId && !legacyKey) return { ok: false, reason: 'Higgsfield non configuré (manque API Key ID + Secret dans /admin/settings)' };
  if (keyId && !secret) return { ok: false, reason: 'Higgsfield : API Key Secret manquant — ajoute-le dans /admin/settings' };

  const buildHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
    const h: Record<string, string> = { ...extra };
    if (keyId && secret) {
      h['hf-api-key'] = keyId;
      h['hf-secret'] = secret;
    } else if (legacyKey) {
      h['Authorization'] = `Bearer ${legacyKey}`;
    }
    return h;
  };

  // Paramètres : valeurs par défaut + clamp aux limites Higgsfield
  const model = opts.model || 'higgsfield-lite';
  const isStandard = model === 'higgsfield-standard';
  const duration = Math.max(3, Math.min(isStandard ? 10 : 5, opts.duration || 5));
  const motion = opts.motion || 'medium';
  const loop = opts.loop !== false;

  // API Higgsfield text-to-video — endpoint et payload selon la doc Higgsfield 2026
  // https://docs.higgsfield.ai
  try {
    const r = await fetch('https://api.higgsfield.ai/v1/generate', {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
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

    // Higgsfield retourne souvent un job_id puis on poll. Pour MVP : si video_url direct, on l'utilise
    if (j.video_url) {
      return { ok: true, kind: 'video', videoUrl: j.video_url, prompt };
    }
    if (j.job_id) {
      // Polling simple : 30 essais x 5s = 150s max
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const poll = await fetch(`https://api.higgsfield.ai/v1/jobs/${j.job_id}`, {
          headers: buildHeaders()
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
