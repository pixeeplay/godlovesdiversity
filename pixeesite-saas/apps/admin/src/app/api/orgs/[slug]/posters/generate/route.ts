import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate a poster: uses Gemini for tagline/copy and fal.ai for image.
 * Falls back gracefully if any key missing.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const theme = b.theme || 'soirée festive';
  const orgId = auth.membership.org.id;

  const geminiKey = await getOrgSecret(orgId, 'GEMINI_API_KEY');
  const falKey = await getOrgSecret(orgId, 'FAL_KEY');

  let tagline = b.tagline || '';
  let copy = b.copy || '';
  if (geminiKey && !tagline) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{
            text: `Crée une phrase d'accroche courte (max 8 mots) et un sous-titre (max 15 mots) en français pour une affiche sur le thème: "${theme}". Réponds en JSON: {"tagline":"...","subtitle":"..."}`,
          }]}],
        }),
      });
      const j: any = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        tagline = parsed.tagline || tagline;
        copy = parsed.subtitle || copy;
      }
    } catch (e: any) {
      console.error('[posters.gemini]', e?.message);
    }
  }

  let imageUrl: string | null = b.imageUrl || null;
  if (falKey && !imageUrl) {
    try {
      const r = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Key ${falKey}` },
        body: JSON.stringify({
          prompt: `${theme}, poster design, vibrant colors, modern typography, eye-catching, no text overlay`,
          image_size: 'portrait_4_3',
        }),
      });
      const j: any = await r.json();
      imageUrl = j?.images?.[0]?.url || null;
    } catch (e: any) {
      console.error('[posters.fal]', e?.message);
    }
  }

  const db = await getTenantPrisma(slug);
  const item = await (db as any).poster.create({
    data: {
      name: b.name || `Affiche ${theme}`,
      theme,
      content: { tagline, copy, prompt: b.prompt || null },
      imageUrl,
      sizes: Array.isArray(b.sizes) ? b.sizes : ['A4'],
    },
  });

  return NextResponse.json({
    ok: true, item,
    used: { gemini: !!geminiKey && !!tagline, fal: !!falKey && !!imageUrl },
  });
}
