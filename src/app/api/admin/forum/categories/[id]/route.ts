import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** PATCH /api/admin/forum/categories/[id] — édition (renommer, réordonner, couleur) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const data = await req.json();
    const allowed: any = {};
    if (typeof data.name === 'string') allowed.name = data.name;
    if (typeof data.description === 'string') allowed.description = data.description;
    if (typeof data.color === 'string') allowed.color = data.color || null;
    if (typeof data.icon === 'string') allowed.icon = data.icon || null;
    if (typeof data.order === 'number') allowed.order = data.order;

    const category = await prisma.forumCategory.update({ where: { id }, data: allowed });
    return NextResponse.json({ category });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

/** DELETE /api/admin/forum/categories/[id] — supprime (refusé si threads existent) */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const count = await prisma.forumThread.count({ where: { categoryId: id } });
    if (count > 0) return NextResponse.json({ error: `${count} sujet(s) dans cette catégorie. Supprime-les ou déplace-les d'abord.` }, { status: 400 });

    await prisma.forumCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
