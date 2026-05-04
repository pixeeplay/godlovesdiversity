import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/coupons/validate
 * Body: { code: string, totalCents: number, category?: string }
 * Renvoie le coupon valide + le nouveau total (avec réduction).
 */
export async function POST(req: NextRequest) {
  try {
    const { code, totalCents, category } = await req.json();
    if (!code) return NextResponse.json({ valid: false, error: 'code requis' }, { status: 400 });

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) return NextResponse.json({ valid: false, error: 'Code inconnu' });
    if (!coupon.active) return NextResponse.json({ valid: false, error: 'Code désactivé' });
    if (coupon.validFrom && new Date(coupon.validFrom) > new Date()) return NextResponse.json({ valid: false, error: 'Pas encore valide' });
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) return NextResponse.json({ valid: false, error: 'Expiré' });
    if (coupon.maxUses && coupon.uses >= coupon.maxUses) return NextResponse.json({ valid: false, error: 'Code épuisé' });
    if (coupon.minOrderCents && totalCents < coupon.minOrderCents) {
      return NextResponse.json({ valid: false, error: `Minimum d'achat : ${(coupon.minOrderCents / 100).toFixed(2)} €` });
    }
    if (coupon.productCategory && category && coupon.productCategory !== category) {
      return NextResponse.json({ valid: false, error: 'Code non valable pour cette catégorie' });
    }

    const discount = coupon.discountKind === 'percent'
      ? Math.round((totalCents * coupon.discountValue) / 100)
      : Math.min(totalCents, coupon.discountValue);

    return NextResponse.json({
      valid: true,
      coupon: { code: coupon.code, kind: coupon.discountKind, value: coupon.discountValue },
      discount,
      newTotal: Math.max(0, totalCents - discount)
    });
  } catch (e: any) {
    return NextResponse.json({ valid: false, error: e?.message }, { status: 500 });
  }
}
