import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ circle: string }> }) {
  const { circle } = await params;
  try {
    const messages = await prisma.prayerMessage.findMany({
      where: { circle },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return NextResponse.json({ messages: messages.reverse() });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ circle: string }> }) {
  const { circle } = await params;
  try {
    const { message, authorName } = await req.json();
    if (!message || message.length > 500) return NextResponse.json({ error: 'message invalide (max 500 chars)' }, { status: 400 });
    const m = await prisma.prayerMessage.create({
      data: { circle, message, authorName: authorName || 'Anonyme' }
    });
    return NextResponse.json({ ok: true, message: m });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
