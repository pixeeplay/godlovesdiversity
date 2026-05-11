import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/forum-threads/[threadId]/moderate
 * Lance la modération IA sur tous les posts du thread.
 * Retourne flagged: { postId, severity, reason }[]
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; threadId: string }> }) {
  const { slug, threadId } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const posts = await (db as any).forumPost.findMany({ where: { threadId } });
  const flagged: any[] = [];

  const SYSTEM = `Tu es un modérateur. Pour chaque message, réponds en JSON strict :
{"severity":"ok|warning|abuse|spam","reason":"..."}
"ok" = aucun problème. "warning" = limite. "abuse" = haine/insulte/menace. "spam" = pub/lien suspect.`;

  for (const p of posts) {
    const result = await aiCall({
      orgId: auth.membership.org.id,
      feature: 'moderation',
      prompt: `Message à modérer : "${p.body.slice(0, 1000)}"`,
      systemPrompt: SYSTEM,
      maxTokens: 200,
    });
    if (!result.ok) continue;
    try {
      const m = result.output.match(/\{[\s\S]*\}/);
      if (!m) continue;
      const parsed = JSON.parse(m[0]);
      if (parsed.severity && parsed.severity !== 'ok') {
        flagged.push({ postId: p.id, body: p.body.slice(0, 100), ...parsed });
      }
    } catch {}
  }

  return NextResponse.json({ flagged, total: posts.length });
}
