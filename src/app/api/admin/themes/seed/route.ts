import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { THEMES_SEED } from '@/lib/themes-seed';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/themes/seed
 * Body: { wipe?: boolean }
 * Crée les 50 thèmes canoniques. Si wipe, efface d'abord tout.
 * Sinon, ne crée que les slugs manquants.
 */
export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const wipe = !!body.wipe;

  let stats = { created: 0, kept: 0, deleted: 0 };

  try {
    if (wipe) {
      const del = await prisma.theme.deleteMany({});
      stats.deleted = del.count;
    }

    const existing = await prisma.theme.findMany({ select: { slug: true } });
    const existingSlugs = new Set(existing.map(t => t.slug));

    for (const t of THEMES_SEED) {
      if (existingSlugs.has(t.slug)) { stats.kept++; continue; }
      await prisma.theme.create({
        data: {
          slug: t.slug,
          name: t.name,
          description: t.description,
          category: t.category,
          colors: t.colors as any,
          fonts: t.fonts as any || undefined,
          decorations: t.decorations as any || undefined,
          customCss: t.customCss || null,
          autoActivate: t.autoActivate,
          daysBefore: t.daysBefore,
          durationDays: t.durationDays,
          holidaySlug: t.holidaySlug || null,
          geographicScope: t.geographicScope || null,
          priority: t.priority || 0
        }
      });
      stats.created++;
    }

    return NextResponse.json({ ok: true, stats });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
