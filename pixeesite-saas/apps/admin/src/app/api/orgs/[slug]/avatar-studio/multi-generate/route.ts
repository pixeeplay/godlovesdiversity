import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { generateVideo as heygenGenerate, getVideoStatus as heygenStatus } from '@/lib/heygen';
import { getTenantPrisma } from '@pixeesite/database';
import { platformDb } from '@pixeesite/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/avatar-studio/multi-generate
 * body: { provider: 'heygen' | 'synthesia' | 'tavus', script, avatarId?, voiceId?, bgColor?, ratio? }
 *
 * → Lance la génération via le provider choisi. HeyGen est l'implé complète,
 * Synthesia et Tavus sont des stubs (TODO + fail propre).
 *
 * Track : platformDb.aiUsage + tenant AvatarGeneration row.
 *
 * GET ?provider=&videoId= → status
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json().catch(() => ({}));
  const provider = String(b.provider || 'heygen').toLowerCase();
  const script = String(b.script || b.text || '').trim();
  if (!script) return NextResponse.json({ error: 'script required' }, { status: 400 });

  const orgId = auth.membership.org.id;
  const db = await getTenantPrisma(slug);

  if (provider === 'heygen') {
    const key = await getOrgSecret(orgId, 'HEYGEN_API_KEY');
    if (!key) return NextResponse.json({ error: 'HEYGEN_API_KEY non configurée' }, { status: 400 });
    if (!b.avatarId || !b.voiceId) return NextResponse.json({ error: 'avatarId, voiceId requis (HeyGen)' }, { status: 400 });
    try {
      const result = await heygenGenerate(key, {
        text: script,
        avatarId: b.avatarId,
        voiceId: b.voiceId,
        bgColor: b.bgColor,
        ratio: b.ratio,
      });

      // Persist AvatarGeneration row
      const avatar = await db.avatar.upsert({
        where: { slug: `heygen-${b.avatarId}` },
        update: { externalId: b.avatarId },
        create: {
          slug: `heygen-${b.avatarId}`,
          name: `HeyGen ${b.avatarId.slice(0, 8)}`,
          provider: 'heygen',
          externalId: b.avatarId,
          status: 'ready',
          voiceId: b.voiceId,
        },
      });
      await db.avatarGeneration.create({
        data: {
          avatarId: avatar.id,
          scriptText: script,
          externalJobId: result.video_id,
          status: 'pending',
          language: String(b.language || 'fr'),
          setting: b.bgColor || null,
        },
      });

      await platformDb.aiUsage.create({
        data: {
          orgId, provider: 'heygen', model: 'avatar-video',
          operation: 'generate', promptTokens: Math.round(script.length / 4), success: true,
        },
      }).catch(() => {});

      return NextResponse.json({ ok: true, provider, video_id: result.video_id });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'HeyGen failed' }, { status: 500 });
    }
  }

  if (provider === 'synthesia') {
    // TODO: implementer Synthesia API
    const key = await getOrgSecret(orgId, 'SYNTHESIA_KEY');
    if (!key) return NextResponse.json({ error: 'SYNTHESIA_KEY non configurée (provider en preview)' }, { status: 400 });
    return NextResponse.json({
      ok: false,
      provider,
      error: 'Synthesia provider en cours d\'intégration. Utilise HeyGen pour l\'instant.',
      todo: true,
    }, { status: 501 });
  }

  if (provider === 'tavus') {
    // TODO: implementer Tavus real-time persona API
    const key = await getOrgSecret(orgId, 'TAVUS_KEY');
    if (!key) return NextResponse.json({ error: 'TAVUS_KEY non configurée (provider en preview)' }, { status: 400 });
    return NextResponse.json({
      ok: false,
      provider,
      error: 'Tavus real-time persona en cours d\'intégration. Utilise HeyGen pour l\'instant.',
      todo: true,
    }, { status: 501 });
  }

  return NextResponse.json({ error: `Provider inconnu : ${provider}` }, { status: 400 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = req.nextUrl;
  const provider = String(url.searchParams.get('provider') || 'heygen');
  const videoId = url.searchParams.get('videoId') || '';
  if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 });

  const orgId = auth.membership.org.id;
  const db = await getTenantPrisma(slug);

  if (provider === 'heygen') {
    const key = await getOrgSecret(orgId, 'HEYGEN_API_KEY');
    if (!key) return NextResponse.json({ error: 'HEYGEN_API_KEY non configurée' }, { status: 400 });
    try {
      const s = await heygenStatus(key, videoId);

      // Update AvatarGeneration row
      if (s.status === 'completed' || s.status === 'failed') {
        await db.avatarGeneration.updateMany({
          where: { externalJobId: videoId },
          data: {
            status: s.status,
            videoUrl: (s as any).video_url || null,
            durationSec: (s as any).duration ? Math.round((s as any).duration) : null,
            errorMessage: (s as any).error?.message || null,
            finishedAt: new Date(),
          },
        }).catch(() => {});
      }

      return NextResponse.json(s);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'status failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: `Provider ${provider} status non supporté` }, { status: 501 });
}
