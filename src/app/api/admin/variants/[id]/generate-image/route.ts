import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBuffer, publicUrl } from '@/lib/storage';
import { getSettings } from '@/lib/settings';

/**
 * Génère une image IA pour un variant via Nano Banana (gemini-2.5-flash-image).
 *
 * Mode image-to-image : si le produit a une image cover, elle est passée en input
 * et le prompt demande à Gemini de garder STRICTEMENT la même composition,
 * en ne modifiant QUE la couleur du variant.
 *
 * Mode text-to-image : fallback si aucune image cover disponible.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const variant = await prisma.productVariant.findUnique({
    where: { id }, include: { product: true }
  });
  if (!variant) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const customPrompt: string | undefined = body.prompt;

  const opts = variant.options && typeof variant.options === 'object' ? variant.options as Record<string, string> : {};
  const colorValue = opts['Couleur'] || opts['Color'] || opts['couleur'] || '';
  const sizeValue = opts['Taille'] || opts['Size'] || opts['taille'] || '';
  const optionsText = Object.entries(opts).map(([k, v]) => `${k}: ${v}`).filter((s) => s.includes(': ') && s.split(': ')[1]).join(', ');

  // Recherche image cover du produit
  const baseImageUrl = variant.product.images?.[0];

  const settings = await getSettings(['integrations.gemini.apiKey', 'integrations.gemini.imageModel'])
    .catch(() => ({} as Record<string, string>));
  const key = settings['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY;
  const model = settings['integrations.gemini.imageModel'] || process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

  if (!key) return NextResponse.json({ error: 'Clé Gemini non configurée' }, { status: 400 });

  // Construit le prompt selon mode
  let prompt: string;
  let inlineImage: { mimeType: string; data: string } | null = null;

  if (baseImageUrl) {
    // ── MODE IMAGE-TO-IMAGE : on garde la composition, on change uniquement la couleur
    try {
      // Si URL relative (commence par /), construit l'URL absolue
      const absUrl = baseImageUrl.startsWith('http') ? baseImageUrl : `${req.nextUrl.origin}${baseImageUrl}`;
      const imgResp = await fetch(absUrl);
      if (imgResp.ok) {
        const buf = Buffer.from(await imgResp.arrayBuffer());
        const mime = imgResp.headers.get('content-type') || 'image/jpeg';
        inlineImage = { mimeType: mime, data: buf.toString('base64') };
      }
    } catch (e) {
      console.error('[variant img-to-img] fetch base failed', e);
    }

    if (colorValue) {
      prompt = customPrompt || `KEEP this image EXACTLY identical: same composition, same product, same pose, same angle, same lighting, same background, same framing.
ONLY change the color of the main product visible in the image to "${colorValue}".
Make it look like the same product photographed in a "${colorValue}" colorway.
Keep all text, logos, and details strictly identical. Photorealistic, premium e-commerce quality.${sizeValue ? ` Variant size: ${sizeValue}.` : ''}`;
    } else {
      prompt = customPrompt || `KEEP this image EXACTLY identical: same composition, same product, same pose, same angle, same lighting, same background.
This is a different variant of the same product (${optionsText || variant.name}). Generate the same image but adapted to this variant. Photorealistic, premium e-commerce.`;
    }
  } else {
    // ── MODE TEXT-TO-IMAGE fallback (pas d'image base disponible)
    prompt = customPrompt || `Premium e-commerce studio photography of "${variant.product.title}" — variant: ${variant.name} (${optionsText}). Soft cinematic daylight, minimal background, photorealistic ultra detailed, no readable text on the product.`;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    // Construit le body : si inlineImage, on l'inclut comme partie du contenu
    const parts: any[] = [{ text: prompt }];
    if (inlineImage) parts.unshift({ inlineData: inlineImage });

    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE'] }
      })
    });
    const j = await r.json();
    if (j.error) return NextResponse.json({ error: j.error.message }, { status: 500 });

    const respParts = j?.candidates?.[0]?.content?.parts || [];
    const imagePart = respParts.find((p: any) => p.inlineData?.data);
    if (!imagePart) return NextResponse.json({ error: 'Pas d\'image dans la réponse' }, { status: 500 });

    const buf = Buffer.from(imagePart.inlineData.data, 'base64');
    const mime = imagePart.inlineData.mimeType || 'image/png';
    const ext = mime.includes('jpeg') ? 'jpg' : 'png';
    const safeName = variant.name.replace(/[^a-z0-9-]/gi, '-').slice(0, 40);
    const objectKey = `variants/${safeName}-${Date.now()}.${ext}`;
    await uploadBuffer(objectKey, buf, mime);
    const newUrl = publicUrl(objectKey);

    const updated = await prisma.productVariant.update({
      where: { id },
      data: { images: [newUrl, ...(variant.images || [])] }
    });
    return NextResponse.json({
      url: newUrl,
      images: updated.images,
      mode: inlineImage ? 'image-to-image' : 'text-to-image'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
