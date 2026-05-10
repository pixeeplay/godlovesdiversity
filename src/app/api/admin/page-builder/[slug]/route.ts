import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) return null;
  return s;
}

/** GET /api/admin/page-builder/[slug] — récupère les blocs d'une page */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { slug } = await ctx.params;
  const blocks = await prisma.pageBlock.findMany({
    where: { pageSlug: slug },
    orderBy: { position: 'asc' }
  });
  return NextResponse.json({ ok: true, slug, blocks });
}

/** PUT /api/admin/page-builder/[slug] body: { blocks: [...] } — replace tous les blocs */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { slug } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const incoming: any[] = Array.isArray(body.blocks) ? body.blocks : [];

  // Strategy : delete blocks not in incoming, upsert le reste
  const incomingIds = new Set(incoming.filter((b) => b.id).map((b) => b.id));

  await prisma.pageBlock.deleteMany({
    where: { pageSlug: slug, id: { notIn: Array.from(incomingIds) } }
  });

  const saved = await Promise.all(
    incoming.map(async (b, i) => {
      const data = {
        pageSlug: slug,
        position: i,
        width: b.width || 'full',
        height: b.height || 'auto',
        type: b.type,
        data: b.data || {},
        effect: b.effect || null,
        effectDelay: typeof b.effectDelay === 'number' ? b.effectDelay : null,
        visible: b.visible !== false
      };
      if (b.id && incomingIds.has(b.id)) {
        return prisma.pageBlock.update({ where: { id: b.id }, data });
      }
      return prisma.pageBlock.create({ data });
    })
  );

  return NextResponse.json({ ok: true, count: saved.length });
}
