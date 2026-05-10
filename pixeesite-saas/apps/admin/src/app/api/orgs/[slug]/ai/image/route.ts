import { NextRequest, NextResponse } from 'next/server';
import { generateImage, generateParallaxLayer } from '@pixeesite/ai';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/ai/image
 * Body: { prompt, layer?: 'image'|'parallax-bg'|'parallax-mid'|'parallax-fg', aspectRatio?, count? }
 *
 * Tracking via @pixeesite/ai assertAiQuota + trackAiUsage (logge dans
 * AiUsage table + decrement org.usedAiCredits).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const prompt = (body.prompt as string)?.trim();
  if (!prompt) return NextResponse.json({ error: 'prompt-required' }, { status: 400 });

  const ctx = { orgId: auth.membership.org.id, userId: auth.userId };
  try {
    if (body.layer && body.layer !== 'image') {
      const layer = body.layer === 'parallax-bg' ? 'bg' : body.layer === 'parallax-mid' ? 'mid' : 'fg';
      const url = await generateParallaxLayer(ctx, layer as any, prompt);
      return NextResponse.json({ ok: true, images: [url], layer });
    }
    const images = await generateImage(ctx, prompt, {
      aspectRatio: body.aspectRatio || '16:9',
      count: Math.min(4, Math.max(1, body.count || 1)),
    });
    return NextResponse.json({ ok: true, images });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'ai-error' }, { status: 500 });
  }
}
