import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const items = await platformDb.orgAiConfig.findMany({
    where: { orgId: auth.membership.org.id },
    orderBy: { feature: 'asc' },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.feature || !b.provider || !b.model) return NextResponse.json({ error: 'feature/provider/model required' }, { status: 400 });
  const row = await platformDb.orgAiConfig.upsert({
    where: { orgId_feature: { orgId: auth.membership.org.id, feature: b.feature } },
    create: {
      orgId: auth.membership.org.id,
      feature: b.feature,
      provider: b.provider,
      model: b.model,
      temperature: b.temperature ?? 0.7,
      maxTokens: b.maxTokens ?? 2048,
      systemPrompt: b.systemPrompt || null,
      baseUrl: b.baseUrl || null,
    },
    update: {
      provider: b.provider,
      model: b.model,
      temperature: b.temperature,
      maxTokens: b.maxTokens,
      systemPrompt: b.systemPrompt,
      baseUrl: b.baseUrl,
      active: b.active !== false,
    },
  });
  return NextResponse.json(row);
}
