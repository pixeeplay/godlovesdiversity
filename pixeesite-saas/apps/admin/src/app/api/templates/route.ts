import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TEMPLATE_SEEDS } from '@/lib/templates-seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let seedAttempted = false;
async function autoSeedMissing() {
  if (seedAttempted) return;
  seedAttempted = true;
  try {
    const existing = await platformDb.template.findMany({ select: { slug: true } });
    const existingSlugs = new Set(existing.map((t) => t.slug));
    const missing = TEMPLATE_SEEDS.filter((t) => !existingSlugs.has(t.slug));
    if (missing.length === 0) return;
    console.log('[templates] Auto-seeding', missing.length, 'missing templates…');
    for (const t of missing) {
      await platformDb.template.create({ data: t }).catch((e) => console.warn('[templates] skip', t.slug, e.message));
    }
    console.log('[templates] Seeded', missing.length, 'new templates (total catalog:', TEMPLATE_SEEDS.length, ')');
  } catch (e) {
    console.error('[templates] auto-seed failed', e);
  }
}

/**
 * GET /api/templates?category=photo&search=mariage
 * Liste publique des templates approuvés.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  await autoSeedMissing();

  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search')?.trim();
  const free = url.searchParams.get('free');

  const where: any = { approved: true };
  if (category) where.category = category;
  if (free === '1') where.free = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const templates = await platformDb.template.findMany({
    where,
    orderBy: [{ popularity: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true, slug: true, name: true, description: true, category: true,
      thumbnailUrl: true, previewUrl: true, free: true, priceCents: true,
      installCount: true, rating: true,
    },
  });

  // Distinct categories pour filtre UI
  const categories = await platformDb.template.findMany({
    where: { approved: true },
    select: { category: true },
    distinct: ['category'],
  }).then((rows) => rows.map((r) => r.category).sort());

  return NextResponse.json({ templates, categories });
}
