import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const reviews = await prisma.productReview.findMany({
      where: { productId: id, status: 'approved' },
      include: { author: { select: { name: true, image: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return NextResponse.json({ reviews, avg, count: reviews.length });
  } catch (e: any) {
    return NextResponse.json({ reviews: [], avg: 0, count: 0, error: e?.message });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const { id } = await params;
  try {
    const { rating, title, content, photos } = await req.json();
    if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: 'rating 1-5 requis' }, { status: 400 });
    const review = await prisma.productReview.create({
      data: {
        productId: id,
        authorId: (s.user as any).id,
        rating: Number(rating),
        title, content,
        photos: Array.isArray(photos) ? photos : [],
        status: 'pending' // modération admin
      }
    });
    return NextResponse.json({ review });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
