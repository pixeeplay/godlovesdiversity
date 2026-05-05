import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireConnectUser, getOrCreateConnectProfile, calcAge, HOSTILE_COUNTRIES } from '@/lib/connect';

export const dynamic = 'force-dynamic';

/**
 * GET /api/connect/discover?mode=rencontres|pro
 * Renvoie le deck de profils à découvrir, filtré et trié.
 */
export async function GET(req: NextRequest) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });

  const me = await getOrCreateConnectProfile(u.id);
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') || 'rencontres';

  // Géo-blocage automatique pour mode Rencontres
  if (mode === 'rencontres' && me.country && HOSTILE_COUNTRIES.has(me.country)) {
    return NextResponse.json({ error: 'Le mode Rencontres est désactivé dans ton pays pour ta sécurité.', items: [] }, { status: 403 });
  }

  // Récupère les exclusions (déjà swipés, bloqués, soi-même)
  const [swiped, blocked] = await Promise.all([
    prisma.connectSwipe.findMany({ where: { fromId: u.id }, select: { toId: true } }),
    prisma.connectBlock.findMany({
      where: { OR: [{ blockerId: u.id }, { blockedId: u.id }] },
      select: { blockerId: true, blockedId: true }
    })
  ]);
  const excludeIds = new Set([
    u.id,
    ...swiped.map(s => s.toId),
    ...blocked.flatMap(b => [b.blockerId, b.blockedId])
  ]);

  let where: any = { userId: { notIn: Array.from(excludeIds) } };

  if (mode === 'rencontres') {
    where.showInRencontres = true;
    if (me.showOnlyVerified) where.verified = true;
    where.country = { notIn: Array.from(HOSTILE_COUNTRIES) };
    // Filtre âge (depuis birthYear)
    const currentYear = new Date().getFullYear();
    where.birthYear = {
      gte: currentYear - me.ageRangeMax,
      lte: currentYear - me.ageRangeMin
    };
  } else if (mode === 'pro') {
    where.showInPro = true;
  } else {
    return NextResponse.json({ error: 'mode invalide' }, { status: 400 });
  }

  const items = await prisma.connectProfile.findMany({
    where,
    take: 50,
    orderBy: { updatedAt: 'desc' },
    include: { user: { select: { id: true, image: true } } }
  });

  // Score de tri (intentions communes pour rencontres, recommandations pour pro)
  const scored = items.map((p) => {
    let score = 0;
    if (mode === 'rencontres') {
      const common = (p.intentions || []).filter((i) => me.intentions.includes(i));
      score = common.length * 10 + (p.verified ? 5 : 0);
    } else {
      score = p.verified ? 10 : 0;
    }
    return { ...p, age: calcAge(p.birthYear), _score: score };
  }).sort((a, b) => b._score - a._score);

  return NextResponse.json({ items: scored, count: scored.length });
}
