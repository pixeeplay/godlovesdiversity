import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { platformDb } from '@pixeesite/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/orgs/[slug]/ai/video
 * body: { prompt, model?, duration?, imageUrl?, aspectRatio? }
 * model: seedance-2-pro (default) | kling-2.5 | runway-gen3 | veo-3
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

  const orgId = auth.membership.org.id;
  const falKey = await getOrgSecret(orgId, 'FAL_API_KEY');
  if (!falKey) return NextResponse.json({ error: 'FAL_API_KEY non configurée' }, { status: 400 });

  const model = b.model || 'seedance-2-pro';
  const modelMap: Record<string, string> = {
    'seedance-2-pro': 'fal-ai/bytedance/seedance/v2/pro/text-to-video',
    'kling-2.5': 'fal-ai/kling-video/v2.5/standard/text-to-video',
    'runway-gen3': 'fal-ai/runway-gen3/turbo/image-to-video',
  };
  const falModel = b.imageUrl ? 'fal-ai/bytedance/seedance/v2/pro/image-to-video' : (modelMap[model] || modelMap['seedance-2-pro']);

  const r = await fetch(`https://queue.fal.run/${falModel}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${falKey}` },
    body: JSON.stringify({
      prompt: b.prompt,
      duration: b.duration || 5,
      aspect_ratio: b.aspectRatio || '16:9',
      ...(b.imageUrl && { image_url: b.imageUrl }),
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    return NextResponse.json({ error: 'fal.ai error', detail: err.slice(0, 500) }, { status: 500 });
  }
  const j = await r.json();

  await platformDb.aiUsage.create({
    data: { orgId, provider: 'fal', model, operation: 'video', videoSeconds: b.duration || 5, costCents: Math.round((b.duration || 5) * 40), success: true },
  }).catch(() => {});

  // queue.fal returns { request_id, status_url, response_url }
  return NextResponse.json({
    requestId: j.request_id, statusUrl: j.status_url, responseUrl: j.response_url,
    provider: 'fal', model,
    message: 'Vidéo en génération. Poll status_url toutes les 3s.',
  });
}
