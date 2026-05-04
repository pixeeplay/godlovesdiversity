import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/peer-help — liste les messages d'entraide actifs (les 30 plus récents)
 */
export async function GET() {
  try {
    const items = await prisma.peerHelp.findMany({
      where: { status: 'active' },
      orderBy: [{ urgent: 'desc' }, { createdAt: 'desc' }],
      take: 30,
      select: {
        id: true, authorName: true, country: true, topic: true,
        message: true, urgent: true, supportCount: true, createdAt: true,
        _count: { select: { responses: true } }
      }
    });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message });
  }
}

/**
 * POST /api/peer-help — créer un message d'aide
 */
export async function POST(req: NextRequest) {
  try {
    const { authorName, authorEmail, country, topic, message, urgent } = await req.json();
    if (!message || message.length < 10) return NextResponse.json({ error: 'message trop court (min 10 chars)' }, { status: 400 });
    if (!topic) return NextResponse.json({ error: 'topic requis' }, { status: 400 });

    const item = await prisma.peerHelp.create({
      data: {
        authorName: authorName || null,
        authorEmail: authorEmail || null,
        country: country || null,
        topic,
        message: message.slice(0, 2000),
        urgent: !!urgent,
        status: 'active'
      }
    });
    return NextResponse.json({ item });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
