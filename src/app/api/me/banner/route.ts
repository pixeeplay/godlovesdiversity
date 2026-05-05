import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/me/banner — génère une bannière perso via Imagen basée sur le profil
 * Body: { customPrompt?: string }
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });

  const userId = (s.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, identity: true, traditions: true, cityProfile: true, bio: true, dashboardTheme: true }
  });
  if (!user) return NextResponse.json({ error: 'user introuvable' }, { status: 404 });

  const { customPrompt } = await req.json().catch(() => ({}));

  // Construit un prompt à partir des infos user
  const traditions = (user.traditions || []).join(', ') || 'spirituel';
  const identity = user.identity || 'personne LGBTQ+';
  const city = user.cityProfile || '';
  const themeMap: any = {
    fuchsia: 'fuchsia magenta vibrant',
    violet: 'violet purple mystique',
    cyan: 'cyan turquoise océanique',
    rose: 'rose gold romantique',
    amber: 'amber doré chaleureux',
    emerald: 'vert émeraude apaisant'
  };
  const themeColor = themeMap[user.dashboardTheme || 'fuchsia'] || themeMap.fuchsia;

  const prompt = customPrompt || `Cinematic ultra wide banner 16:9, soft dreamy aesthetic, abstract spiritual art for ${identity}, ${traditions} tradition, ${themeColor} color palette, light beams, hopeful inclusive atmosphere, no text, no faces, photorealistic, 8K, ${city ? `inspired by ${city}` : ''}`;

  // Appel Imagen
  const setting = await prisma.setting.findUnique({ where: { key: 'integrations.gemini.apiKey' } }).catch(() => null);
  const apiKey = setting?.value || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Gemini non configuré' }, { status: 500 });

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '16:9', personGeneration: 'allow_adult' }
      })
    });
    const j = await r.json();
    if (!r.ok || j.error) return NextResponse.json({ error: j.error?.message || 'Imagen error' }, { status: 500 });

    const img = j.predictions?.[0];
    if (!img?.bytesBase64Encoded) return NextResponse.json({ error: 'pas d\'image générée' }, { status: 500 });

    // Sauve l'image via /api/admin/ai/save-image
    const dataUrl = `data:${img.mimeType || 'image/png'};base64,${img.bytesBase64Encoded}`;
    const saveR = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/admin/ai/save-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: img.bytesBase64Encoded, mimeType: img.mimeType, name: `user-banner-${userId}` })
    }).catch(() => null);

    let bannerUrl = dataUrl;
    if (saveR?.ok) {
      const sj = await saveR.json();
      if (sj.url) bannerUrl = sj.url;
    }

    await prisma.user.update({ where: { id: userId }, data: { bannerUrl, bannerPrompt: prompt } });
    return NextResponse.json({ ok: true, bannerUrl, prompt });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function DELETE() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  await prisma.user.update({ where: { id: (s.user as any).id }, data: { bannerUrl: null, bannerPrompt: null } });
  return NextResponse.json({ ok: true });
}
