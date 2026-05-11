import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orgs/[slug]/integrations
 * Liste tous les IntegrationConfig (un par provider).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const db = await getTenantPrisma(slug);
  try {
    const items = await (db as any).integrationConfig.findMany({ orderBy: { provider: 'asc' } });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message });
  }
}

/**
 * POST /api/orgs/[slug]/integrations
 * Crée ou upsert une intégration. Body: { provider, displayName?, active?, config? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const b = await req.json();
  if (!b.provider) return NextResponse.json({ error: 'provider requis' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const item = await (db as any).integrationConfig.upsert({
    where: { provider: b.provider },
    create: {
      provider: b.provider,
      displayName: b.displayName || b.provider,
      active: b.active !== false,
      config: b.config || {},
    },
    update: {
      displayName: b.displayName ?? undefined,
      active: typeof b.active === 'boolean' ? b.active : undefined,
      config: b.config ?? undefined,
    },
  });
  return NextResponse.json({ ok: true, item });
}
