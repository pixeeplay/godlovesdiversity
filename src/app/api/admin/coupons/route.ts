import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ coupons });
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const coupon = await prisma.coupon.create({
      data: {
        code: String(body.code).toUpperCase(),
        discountKind: body.discountKind || 'percent',
        discountValue: Number(body.discountValue) || 0,
        minOrderCents: body.minOrderCents || null,
        maxUses: body.maxUses || null,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        productCategory: body.productCategory || null,
        active: body.active !== false,
        createdBy: (s.user as any)?.id || null
      }
    });
    return NextResponse.json({ coupon });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
