import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** GET /api/admin/forum/categories — liste */
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const categories = await prisma.forumCategory.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { threads: true } } }
    });
    return NextResponse.json({ categories });
  } catch (e: any) {
    return NextResponse.json({ categories: [], error: e?.message });
  }
}

/** POST /api/admin/forum/categories — créer */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const { name, slug, description, color, icon, order } = await req.json();
    if (!name || !slug) return NextResponse.json({ error: 'name + slug requis' }, { status: 400 });

    const slugClean = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!slugClean) return NextResponse.json({ error: 'slug invalide' }, { status: 400 });

    const category = await prisma.forumCategory.create({
      data: {
        name,
        slug: slugClean,
        description: description || null,
        color: color || null,
        icon: icon || null,
        order: typeof order === 'number' ? order : 0
      }
    });
    return NextResponse.json({ category });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
