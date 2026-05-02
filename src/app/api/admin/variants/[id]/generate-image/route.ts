import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBuffer, publicUrl } from '@/lib/storage';
import { getSettings } from '@/lib/settings';

/**
 * Génère une image IA Nano Banana pour un variant en utilisant
 * son nom + ses options (Taille/Couleur/...) pour personnaliser le prompt.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const variant = await prisma.productVariant.findUnique({ where: { id }, include: { product: true } });
  if (!variant) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const customPrompt: string | undefined = body.prompt;

  // Construit un prompt thématique + injecte les options du variant (Taille/Couleur)
  const optionsText = variant.options && typeof variant.options === 'object'
    ? Object.entries(variant.options as any).map(([k, v]) => `${k}: ${v}`).join(', ')
    : '';
  const autoPrompt = `Premium e-commerce studio photography of "${variant.product.title}" in this exact variant: ${variant.name} (${optionsText}). Category: ${variant.product.category || 'product'}. Soft cinematic daylight, minimal background matching the product color, photorealistic ultra detailed, no readable text on the product. ${variant.product.description?.slice(0, 200) || ''}`;
  const prompt = customPrompt || autoPrompt;

  const settings = await getSettings(['integrations.gemini.apiKey', 'integrations.gemini.imageModel'])
    .catch(() => ({} as Record<string, string>));
  const key = settings['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY;
  const model = settings['integrations.gemini.imageModel'] || process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

  if (!key) return NextResponse.json({ error: 'Clé Gemini non configurée' }, { status: 400 });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] }
      })
    });
    const j = await r.json();
    if (j.error) return NextResponse.json({ error: j.error.message }, { status: 500 });

    const parts = j?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.data);
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
    return NextResponse.json({ url: newUrl, images: updated.images });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
