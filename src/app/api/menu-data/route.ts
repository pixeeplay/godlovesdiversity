import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Données pour les mega-menus du header :
 * - Produits boutique récents par catégorie
 * - Types de photos (Église, Mosquée, etc.) avec compteur
 * - Pays/villes populaires
 */
export async function GET() {
  try {
    const [products, photoTypes, countries] = await Promise.all([
      prisma.product.findMany({
        where: { published: true },
        orderBy: { order: 'asc' },
        take: 8,
        select: { id: true, slug: true, title: true, category: true, priceCents: true, currency: true, images: true }
      }),
      prisma.photo.groupBy({
        by: ['placeType'],
        where: { status: 'APPROVED' },
        _count: { _all: true },
        orderBy: { _count: { placeType: 'desc' } }
      }).catch(() => [] as any[]),
      prisma.photo.groupBy({
        by: ['country'],
        where: { status: 'APPROVED', country: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { country: 'desc' } },
        take: 8
      }).catch(() => [] as any[])
    ]);

    // Groupe les produits par catégorie
    const productsByCategory: Record<string, typeof products> = {};
    for (const p of products) {
      const cat = p.category || 'Autre';
      if (!productsByCategory[cat]) productsByCategory[cat] = [];
      productsByCategory[cat].push(p);
    }

    return NextResponse.json({
      products,
      productsByCategory,
      photoTypes: photoTypes.map((t: any) => ({ type: t.placeType, count: t._count._all })),
      countries: countries.map((c: any) => ({ country: c.country, count: c._count._all }))
    });
  } catch {
    return NextResponse.json({ products: [], productsByCategory: {}, photoTypes: [], countries: [] });
  }
}
