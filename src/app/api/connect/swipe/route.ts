import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireConnectUser } from '@/lib/connect';

export const dynamic = 'force-dynamic';

/**
 * POST /api/connect/swipe
 * Body: { toUserId: string, action: 'like' | 'pass' | 'super', intentions?: string[] }
 * Détecte les matches croisés (like/super des 2 côtés).
 */
export async function POST(req: NextRequest) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });

  const { toUserId, action, intentions = [] } = await req.json();
  if (!toUserId || !['like', 'pass', 'super'].includes(action)) {
    return NextResponse.json({ error: 'paramètres invalides' }, { status: 400 });
  }
  if (toUserId === u.id) return NextResponse.json({ error: 'on ne se swipe pas soi-même' }, { status: 400 });

  // Quota free tier : 50 swipes/jour, illimité si premium
  const isPremium = await prisma.connectPremium.findUnique({ where: { userId: u.id } }).then(p => p?.status === 'active' || p?.status === 'trialing');
  if (!isPremium && action !== 'pass') {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayCount = await prisma.connectSwipe.count({
      where: { fromId: u.id, action: { in: ['like', 'super'] }, createdAt: { gte: today } }
    });
    if (todayCount >= 50) {
      return NextResponse.json({ error: 'Limite quotidienne atteinte (50 likes/jour). Passe Premium pour swipes illimités.', premium: true }, { status: 429 });
    }
  }

  // Enregistre/met à jour le swipe
  await prisma.connectSwipe.upsert({
    where: { fromId_toId: { fromId: u.id, toId: toUserId } },
    update: { action, intentions },
    create: { fromId: u.id, toId: toUserId, action, intentions }
  });

  if (action === 'pass') return NextResponse.json({ ok: true, match: false });

  // Vérifie le swipe inverse
  const reverse = await prisma.connectSwipe.findUnique({
    where: { fromId_toId: { fromId: toUserId, toId: u.id } }
  });

  if (reverse && (reverse.action === 'like' || reverse.action === 'super')) {
    // MATCH ! Crée le match (deterministic key : user1 < user2)
    const [u1, u2] = [u.id, toUserId].sort();
    const commonIntentions = intentions.filter((i: string) => (reverse.intentions || []).includes(i));
    const match = await prisma.connectMatch.upsert({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
      update: {},
      create: { user1Id: u1, user2Id: u2, intentions: commonIntentions }
    });

    // Crée la conversation si pas déjà
    await prisma.connectConversation.upsert({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
      update: {},
      create: { user1Id: u1, user2Id: u2, origin: 'match' }
    });

    return NextResponse.json({ ok: true, match: true, matchId: match.id, commonIntentions });
  }

  return NextResponse.json({ ok: true, match: false });
}
