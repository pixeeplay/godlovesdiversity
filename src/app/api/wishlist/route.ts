import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ items: [], anonymous: true });
  try {
    const items = await prisma.wishlist.findMany({
      where: { userId: (s.user as any).id },
      include: { product: true }
    });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message });
  }
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: 'productId requis' }, { status: 400 });
  try {
    const item = await prisma.wishlist.upsert({
      where: { userId_productId: { userId: (s.user as any).id, productId } },
      create: { userId: (s.user as any).id, productId },
      update: {}
    });
    return NextResponse.json({ item });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const productId = req.nextUrl.searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'productId requis' }, { status: 400 });
  try {
    await prisma.wishlist.delete({
      where: { userId_productId: { userId: (s.user as any).id, productId } }
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
