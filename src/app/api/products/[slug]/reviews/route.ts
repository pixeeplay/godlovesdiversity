import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/products/[slug]/reviews — liste des avis approuvés + moyenne
 * POST /api/products/[slug]/reviews — créer un avis (auth requis, modération admin)
 *
 * Le routage Next.js exige que les segments dynamiques aient le même nom au même
 * niveau. Comme /api/products/[slug]/route.ts existe déjà pour fetch par slug,
 * les sous-routes doivent utiliser [slug] aussi (pas [id]).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) return NextResponse.json({ reviews: [], avg: 0, count: 0 });

    const reviews = await prisma.productReview.findMany({
      where: { productId: product.id, status: 'approved' },
      include: { author: { select: { name: true, image: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return NextResponse.json({ reviews, avg, count: reviews.length });
  } catch (e: any) {
    return NextResponse.json({ reviews: [], avg: 0, count: 0, error: e?.message });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const { slug } = await params;
  try {
    const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) return NextResponse.json({ error: 'produit introuvable' }, { status: 404 });

    const { rating, title, content, photos } = await req.json();
    if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: 'rating 1-5 requis' }, { status: 400 });
    const review = await prisma.productReview.create({
      data: {
        productId: product.id,
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
