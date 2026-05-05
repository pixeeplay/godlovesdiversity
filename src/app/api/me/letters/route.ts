import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ letters: [] });
  const letters = await prisma.futureLetter.findMany({
    where: { userId: (s.user as any).id }, orderBy: { deliveryDate: 'asc' }
  });
  return NextResponse.json({ letters });
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  try {
    const { subject, content, deliveryDate } = await req.json();
    if (!content || !deliveryDate) return NextResponse.json({ error: 'content + deliveryDate requis' }, { status: 400 });
    const letter = await prisma.futureLetter.create({
      data: { userId: (s.user as any).id, subject: subject || null, content, deliveryDate: new Date(deliveryDate) }
    });
    return NextResponse.json({ ok: true, letter });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
