import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

/**
 * Génère un visuel IA via Google Imagen (Gemini API).
 * Body : { prompt: string, count?: number }
 * Retourne : { images: [{ data: 'base64...', mimeType: 'image/png' }] }
 */
const PRESETS = {
  hero_man: 'A photorealistic image of a man seen from behind, standing in a gothic cathedral, looking at a stained glass rose window, a powerful rainbow-colored beam of divine light shining down on him, dust particles floating in the light, cinematic lighting, painterly style, hopeful and serene mood, no text, no logo',
  hero_woman: 'A photorealistic image of a woman seen from behind, standing in a sunlit cathedral nave, facing a glowing stained glass window, rainbow light beams cascading from above onto her, ethereal atmosphere, dust particles, cinematic, peaceful, no text',
  hero_group: 'A photorealistic image of a small group of people of diverse origins seen from behind in a cathedral, holding hands, facing a stained glass window with rainbow light pouring through, warm divine glow, cinematic, inclusive, hopeful, no text',
  hero_praying: 'A photorealistic image of a person kneeling in prayer in a softly lit chapel, a rainbow stained glass window above them casts colored light, golden particles in the air, peaceful, painterly, no text',
  mosque: 'A photorealistic image of a person standing in a mosque under a colorful tiled dome, soft rainbow reflections on the walls from a stained skylight, divine light beam, peaceful and inclusive mood, no text',
  synagogue: 'A photorealistic image of a person standing under a Star of David stained glass window, rainbow colored light cast on the floor, prayer shawl, golden ambiance, cinematic, no text',
  temple: 'A photorealistic image of a person seated in lotus position in a temple, rainbow light filtering through windows, lotus flowers, golden glow, serene, no text'
};

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const presetKey: keyof typeof PRESETS | undefined = body.preset;
  const customPrompt: string | undefined = body.prompt;
  const count = Math.min(4, Math.max(1, Number(body.count) || 1));

  const prompt = customPrompt || (presetKey ? PRESETS[presetKey] : null);
  if (!prompt) return NextResponse.json({ error: 'prompt or preset required' }, { status: 400 });

  const settings = await getSettings(['integrations.gemini.apiKey', 'integrations.gemini.imageModel'])
    .catch(() => ({} as Record<string, string>));
  const key = settings['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY;
  const model = settings['integrations.gemini.imageModel'] || process.env.GEMINI_IMAGE_MODEL || 'imagen-3.0-generate-002';

  if (!key) {
    return NextResponse.json({
      error: 'Clé Gemini non configurée. Va dans /admin/settings → Gemini IA.'
    }, { status: 400 });
  }

  // Appel Imagen via REST
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${key}`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: count, aspectRatio: '16:9' }
      })
    });
    const j = await r.json();
    if (j.error) {
      return NextResponse.json({ error: j.error.message || 'Erreur Imagen' }, { status: 500 });
    }
    const images = (j.predictions || []).map((p: any) => ({
      data: p.bytesBase64Encoded,
      mimeType: p.mimeType || 'image/png'
    })).filter((i: any) => i.data);

    if (images.length === 0) {
      return NextResponse.json({ error: 'Aucune image générée. Vérifie ton quota Imagen.' }, { status: 500 });
    }
    return NextResponse.json({ images, prompt });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ presets: Object.keys(PRESETS), descriptions: PRESETS });
}
