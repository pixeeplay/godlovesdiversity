import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBuffer, publicUrl } from '@/lib/storage';
import { getSettings } from '@/lib/settings';

/**
 * Génère 1 image IA (Nano Banana / Gemini 2.5 Flash Image) pour un produit
 * et l'ajoute automatiquement à ses images.
 * Body: { prompt?: string }  (sinon prompt auto basé sur titre + catégorie)
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const customPrompt: string | undefined = body.prompt;

  // Construit un prompt thématique automatique
  const autoPrompt = buildPrompt(product.title, product.category, product.description);
  const prompt = customPrompt || autoPrompt;

  const settings = await getSettings(['integrations.gemini.apiKey', 'integrations.gemini.imageModel'])
    .catch(() => ({} as Record<string, string>));
  const key = settings['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY;
  const model = settings['integrations.gemini.imageModel'] || process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

  if (!key) {
    return NextResponse.json({ error: 'Clé Gemini non configurée. Va dans /admin/settings.' }, { status: 400 });
  }

  try {
    // Appel Nano Banana
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] }
      })
    });
    const j = await r.json();
    if (j.error) return NextResponse.json({ error: j.error.message }, { status: 500 });

    const parts = j?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.data);
    if (!imagePart) return NextResponse.json({ error: 'Pas d\'image dans la réponse Gemini' }, { status: 500 });

    // Sauvegarde dans MinIO
    const buf = Buffer.from(imagePart.inlineData.data, 'base64');
    const mime = imagePart.inlineData.mimeType || 'image/png';
    const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
    const safeSlug = product.slug.replace(/[^a-z0-9-]/gi, '-').slice(0, 40);
    const objectKey = `products/${safeSlug}-${Date.now()}.${ext}`;
    await uploadBuffer(objectKey, buf, mime);
    const newImageUrl = publicUrl(objectKey);

    // Ajoute aux images du produit (en première position)
    const updatedImages = [newImageUrl, ...(product.images || [])];
    await prisma.product.update({
      where: { id },
      data: { images: updatedImages }
    });

    return NextResponse.json({ url: newImageUrl, images: updatedImages, prompt, model });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function buildPrompt(title: string, category: string | null, description: string | null): string {
  const cat = (category || '').toLowerCase();
  const hint = (description || '').slice(0, 200);

  // Préréglages selon la catégorie
  if (cat.includes('vêtement') || cat.includes('vetement') || /t-?shirt|sweat|hoodie/i.test(title)) {
    return `Premium e-commerce studio photography of "${title}" — folded organic cotton apparel on a soft rose pink gradient background, with delicate rainbow heart embroidery visible on chest, soft cinematic daylight from the left, minimalist composition, photorealistic, no models, no text on the garment except the brand name in gold thread. ${hint}`;
  }
  if (cat.includes('bougie') || /candle|bougie/i.test(title)) {
    return `Premium e-commerce studio photography of "${title}" — a single artisan soy candle in a stained glass holder with red ruby, cobalt blue and emerald green facets, warm flame glowing softly inside, dark velvet background, golden bokeh particles floating around, spiritual cathedral atmosphere, photorealistic, ultra detailed, no text. ${hint}`;
  }
  if (cat.includes('mug') || /mug|tasse|cup/i.test(title)) {
    return `Premium e-commerce studio photography of "${title}" — a white ceramic mug with a delicate rainbow heart and small religious symbols (cross, crescent, star, mandala) painted around it like a crown, soft pink minimal background, gentle steam rising, daylight from the right, photorealistic, no text on the mug. ${hint}`;
  }
  if (cat.includes('sac') || /tote|bag|sac/i.test(title)) {
    return `Premium e-commerce studio photography of "${title}" — a natural canvas tote bag hanging on a brass hook, golden cathedral typography "GOD LOVES DIVERSITY" and a rainbow heart screen-printed on it, soft window light, minimal Scandinavian interior, photorealistic. ${hint}`;
  }
  if (cat.includes('affiche') || /poster|affiche|art print/i.test(title)) {
    return `Premium e-commerce mockup of "${title}" — a framed art poster showing a silhouetted figure standing in a gothic cathedral facing a rose stained glass window with a powerful rainbow light beam descending, hung on a clean off-white wall, soft diffused daylight, minimal interior, photorealistic, no readable text. ${hint}`;
  }
  if (cat.includes('livre') || /book|livre|guide/i.test(title)) {
    return `Premium e-commerce studio photography of "${title}" — a hardcover book with a cathedral stained glass cover design in rainbow colors and gold foil typography, lying on a wooden table with soft side light, photorealistic, no readable text. ${hint}`;
  }
  // Fallback générique
  return `Premium e-commerce product photography of "${title}", category ${category || 'accessory'}, soft cinematic daylight, minimal pink and gold color palette, photorealistic, ultra detailed, no readable text on the product. ${hint}`;
}
