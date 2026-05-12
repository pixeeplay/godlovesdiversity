/**
 * Phase 20 — POST /api/admin/seed-marketplace-templates
 *
 * Super-admin only. Triggers the upsert of the 11 themed marketplace templates
 * (Photographe, Restaurant, Coach, Podcast, Asso, École, Agence, Immo, E-com, Link, Blog).
 *
 * Idempotent — safe to rerun.
 */
import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/super-admin';
import { seedMarketplaceTemplates } from '@/lib/marketplace-templates-seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  try {
    await requireSuperAdmin();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'forbidden' }, { status: 403 });
  }

  try {
    const report = await seedMarketplaceTemplates();
    return NextResponse.json(report, { status: report.ok ? 200 : 500 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message?.slice(0, 500) || 'unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
