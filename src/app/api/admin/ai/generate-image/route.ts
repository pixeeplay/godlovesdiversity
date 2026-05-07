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
  hero_pride: 'A photorealistic image of a Pride march in Paris, smiling diverse people holding rainbow flags, golden hour light, joyful, painterly, no text',
  mosque: 'A photorealistic image of a person standing in a mosque under a colorful tiled dome, soft rainbow reflections on the walls from a stained skylight, divine light beam, peaceful and inclusive mood, no text',
  pride_window: 'A photorealistic image of a person standing under a Pride flag in a sunlit room, rainbow colored light cast on the floor, contemplative ambiance, cinematic, no text',
  temple: 'A photorealistic image of a person seated in lotus position in a temple, rainbow light filtering through windows, lotus flowers, golden glow, serene, no text',
  // ─── Produits boutique ───
  product_tshirt: 'Studio product photography of a folded white organic cotton t-shirt on a soft rose pink gradient background, with a small rainbow heart embroidery visible on the chest, soft daylight, minimalist, premium e-commerce style, no text on the t-shirt',
  product_pride: 'Studio product photography of a Pride enamel pin (rainbow flag), polished chrome, dark velvet background, golden bokeh particles, premium queer atmosphere, photorealistic e-commerce',
  product_mug: 'Studio product photography of a white ceramic mug with a delicate rainbow heart design and a small cross/crescent/star symbol, on a soft pink minimal background, steam rising softly, daylight, premium e-commerce',
  product_tote: 'Studio product photography of a natural canvas tote bag hanging on a hook, with golden cathedral typography "GOD LOVES DIVERSITY" and a rainbow heart printed on it, soft window light, premium e-commerce style',
  product_poster: 'Studio product photography of a framed art poster showing a silhouette in front of a gothic cathedral rose window with a rainbow light beam, hung on a clean wall, soft daylight, minimal interior, premium e-commerce'
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
  // Modèle par défaut : gemini-2.5-flash-image (alias "Nano Banana") — moins cher et plus rapide qu'Imagen
  const model = settings['integrations.gemini.imageModel'] || process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

  if (!key) {
    return NextResponse.json({
      error: 'Clé Gemini non configurée. Va dans /admin/settings → Gemini IA.'
    }, { status: 400 });
  }

  // Routing : Nano Banana (gemini-2.5-flash-image) vs Imagen (imagen-*)
  const isNanoBanana = model.includes('flash-image') || model.startsWith('gemini-');

  try {
    if (isNanoBanana) {
      // Gemini 2.5 Flash Image (Nano Banana) via :generateContent
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const images: { data: string; mimeType: string }[] = [];
      // Nano Banana ne fait qu'1 image par appel — on boucle
      for (let i = 0; i < count; i++) {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['IMAGE'] }
          })
        });
        const j = await r.json();
        if (j.error) {
          if (i === 0) return NextResponse.json({ error: j.error.message || 'Erreur Nano Banana' }, { status: 500 });
          break;
        }
        const parts = j?.candidates?.[0]?.content?.parts || [];
        for (const p of parts) {
          if (p.inlineData?.data) {
            images.push({ data: p.inlineData.data, mimeType: p.inlineData.mimeType || 'image/png' });
          }
        }
      }
      if (images.length === 0) {
        return NextResponse.json({ error: 'Aucune image générée. Vérifie ton quota Gemini.' }, { status: 500 });
      }
      return NextResponse.json({ images, prompt, model });
    }

    // Imagen via :predict
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${key}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: count, aspectRatio: '1:1' }
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
    return NextResponse.json({ images, prompt, model });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ presets: Object.keys(PRESETS), descriptions: PRESETS });
}
