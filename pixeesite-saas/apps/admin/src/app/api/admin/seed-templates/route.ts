import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { platformDb } from '@pixeesite/database';
import { TEMPLATE_SEEDS } from '@/lib/templates-seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST/GET /api/admin/seed-templates
 * Seed the marketplace with TEMPLATE_SEEDS templates.
 * Auth: any authenticated user can trigger (idempotent).
 */
async function seed() {
  let created = 0, skipped = 0;
  for (const t of TEMPLATE_SEEDS) {
    const existing = await platformDb.template.findUnique({ where: { slug: t.slug } });
    if (existing) { skipped++; continue; }
    await platformDb.template.create({ data: t });
    created++;
  }
  return { ok: true, total: TEMPLATE_SEEDS.length, created, skipped };
}

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await seed());
}

export async function POST() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await seed());
}
