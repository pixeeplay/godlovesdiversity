import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugifyKey(s: string) {
  return (s || 'flag').toLowerCase().replace(/[^a-z0-9._-]+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'flag';
}

/**
 * GET /api/orgs/[slug]/feature-flags
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const db = await getTenantPrisma(slug);
  try {
    const items = await (db as any).featureFlag.findMany({ orderBy: { key: 'asc' } });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message });
  }
}

/**
 * POST /api/orgs/[slug]/feature-flags
 * Crée un flag. Body: { key, displayName?, description?, value?, rollout?, conditions?, audience? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const b = await req.json();
  if (!b.key) return NextResponse.json({ error: 'key requis' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const key = slugifyKey(b.key);
  const item = await (db as any).featureFlag.upsert({
    where: { key },
    create: {
      key,
      displayName: b.displayName || key,
      description: b.description || null,
      value: !!b.value,
      rollout: typeof b.rollout === 'number' ? Math.max(0, Math.min(100, b.rollout)) : 100,
      conditions: b.conditions || null,
      audience: b.audience || null,
    },
    update: {
      displayName: b.displayName ?? undefined,
      description: b.description ?? undefined,
      value: typeof b.value === 'boolean' ? b.value : undefined,
      rollout: typeof b.rollout === 'number' ? Math.max(0, Math.min(100, b.rollout)) : undefined,
      conditions: b.conditions ?? undefined,
      audience: b.audience ?? undefined,
    },
  });
  return NextResponse.json({ ok: true, item });
}
