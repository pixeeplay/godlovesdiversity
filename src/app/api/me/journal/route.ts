import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ entries: [] });
  const entries = await prisma.journalEntry.findMany({
    where: { userId: (s.user as any).id }, orderBy: { createdAt: 'desc' }, take: 100
  });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  try {
    const { title, content, mood, tags, encrypted } = await req.json();
    if (!content) return NextResponse.json({ error: 'contenu requis' }, { status: 400 });
    const entry = await prisma.journalEntry.create({
      data: { userId: (s.user as any).id, title: title || null, content, mood: mood || null, tags: Array.isArray(tags) ? tags : [], encrypted: !!encrypted }
    });
    return NextResponse.json({ ok: true, entry });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
  await prisma.journalEntry.delete({ where: { id, userId: (s.user as any).id } as any }).catch(() => null);
  return NextResponse.json({ ok: true });
}
