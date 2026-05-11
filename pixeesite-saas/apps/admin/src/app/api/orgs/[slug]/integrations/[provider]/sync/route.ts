import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/integrations/[provider]/sync
 * Trigger manuel d'une sync (placeholder — pour la plupart des providers,
 * la "sync" est event-driven via webhook, donc on note simplement l'horodatage).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; provider: string }> }) {
  const { slug, provider } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const db = await getTenantPrisma(slug);
  const item = await (db as any).integrationConfig.upsert({
    where: { provider },
    create: { provider, displayName: provider, active: true, lastSyncAt: new Date(), lastSyncStatus: 'manual-sync', config: {} },
    update: { lastSyncAt: new Date(), lastSyncStatus: 'manual-sync' },
  }).catch(() => null);
  return NextResponse.json({ ok: true, item, note: 'Sync manuelle enregistrée. Les vrais transferts dépendent du provider.' });
}
