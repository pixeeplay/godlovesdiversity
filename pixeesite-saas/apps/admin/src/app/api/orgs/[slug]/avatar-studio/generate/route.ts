import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { generateVideo, getVideoStatus } from '@/lib/heygen';
import { platformDb } from '@pixeesite/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/avatar-studio/generate
 * body: { text, avatarId, voiceId, bgColor?, ratio? }
 * → renvoie video_id. Le client polle ensuite GET ?videoId=...
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json();
  if (!b.text || !b.avatarId || !b.voiceId) {
    return NextResponse.json({ error: 'text, avatarId, voiceId requis' }, { status: 400 });
  }

  const orgId = auth.membership.org.id;
  const key = await getOrgSecret(orgId, 'HEYGEN_API_KEY');
  if (!key) return NextResponse.json({ error: 'HEYGEN_API_KEY non configurée' }, { status: 400 });

  try {
    const result = await generateVideo(key, {
      text: b.text,
      avatarId: b.avatarId,
      voiceId: b.voiceId,
      bgColor: b.bgColor,
      ratio: b.ratio,
    });
    await platformDb.aiUsage.create({
      data: { orgId, provider: 'heygen', model: 'avatar-video', operation: 'generate', promptTokens: Math.round(b.text.length / 4), success: true },
    }).catch(() => {});
    return NextResponse.json({ ok: true, video_id: result.video_id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'HeyGen generate failed' }, { status: 500 });
  }
}

/** GET ?videoId=xxx → status (polling). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const videoId = req.nextUrl.searchParams.get('videoId') || '';
  if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  const key = await getOrgSecret(auth.membership.org.id, 'HEYGEN_API_KEY');
  if (!key) return NextResponse.json({ error: 'HEYGEN_API_KEY non configurée' }, { status: 400 });
  try {
    const s = await getVideoStatus(key, videoId);
    return NextResponse.json(s);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'status failed' }, { status: 500 });
  }
}
