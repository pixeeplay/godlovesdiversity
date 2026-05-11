import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

  const result = await aiCall({
    orgId: auth.membership.org.id,
    feature: b.feature || 'text',
    prompt: b.prompt,
    systemPrompt: b.systemPrompt,
    temperature: b.temperature,
    maxTokens: b.maxTokens,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'AI failed', provider: result.provider }, { status: 500 });
  }
  return NextResponse.json({
    output: result.output,
    provider: result.provider,
    model: result.model,
    tokens: { prompt: result.promptTokens, output: result.outputTokens },
  });
}
