import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ bookmarks: [] });
  const type = req.nextUrl.searchParams.get('type');
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: (s.user as any).id, ...(type ? { resourceType: type } : {}) },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json({ bookmarks });
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { resourceType, resourceId, note } = await req.json();
  if (!resourceType || !resourceId) return NextResponse.json({ error: 'resourceType + resourceId requis' }, { status: 400 });
  try {
    const b = await prisma.bookmark.upsert({
      where: { userId_resourceType_resourceId: { userId: (s.user as any).id, resourceType, resourceId } },
      create: { userId: (s.user as any).id, resourceType, resourceId, note },
      update: { note }
    });
    return NextResponse.json({ ok: true, bookmark: b });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
  await prisma.bookmark.delete({ where: { id, userId: (s.user as any).id } as any }).catch(() => null);
  return NextResponse.json({ ok: true });
}
