import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/ai-providers/test
 *   body: { feature?: string, prompt: string }
 *   → exécute un test live sur la feature (provider + model) configurée.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const orgId = auth.membership.org.id;
  const b = await req.json().catch(() => ({}));
  const feature = (b.feature as any) || 'text';
  const prompt = String(b.prompt || 'Dis bonjour à la communauté en 20 mots.');
  const t0 = Date.now();
  const r = await aiCall({ orgId, feature, prompt, maxTokens: b.maxTokens || 300 });
  return NextResponse.json({
    ok: r.ok,
    text: r.output,
    error: r.error,
    providerId: r.provider,
    model: r.model,
    tookMs: Date.now() - t0,
    promptTokens: r.promptTokens,
    outputTokens: r.outputTokens,
  });
}
