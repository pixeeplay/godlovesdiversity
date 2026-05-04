import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const testimonies = await prisma.videoTestimony.findMany({
      where: { status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return NextResponse.json({ testimonies });
  } catch (e: any) {
    return NextResponse.json({ testimonies: [], error: e?.message }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { authorName, authorEmail, videoUrl, thumbnailUrl, duration, locale, title } = await req.json();
    if (!videoUrl) return NextResponse.json({ error: 'videoUrl requise' }, { status: 400 });
    const t = await prisma.videoTestimony.create({
      data: { authorName, authorEmail, videoUrl, thumbnailUrl, duration, locale: locale || 'fr', title, status: 'pending' }
    });
    return NextResponse.json({ testimony: t });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
