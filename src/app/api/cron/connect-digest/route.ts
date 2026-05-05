import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Cron hebdo : envoie un digest email aux users actifs.
 * - 3 nouveaux pros près de toi
 * - 5 témoignages les plus likés
 * - Tes matches sans réponse
 *
 * À déclencher toutes les semaines (lundi 9h via Vercel Cron ou cron Coolify).
 * Auth via header X-CRON-KEY = process.env.CRON_KEY.
 */
export async function POST(req: Request) {
  const key = req.headers.get('x-cron-key');
  if (key !== process.env.CRON_KEY) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const weekAgo = new Date(Date.now() - 7 * 86400000);

  // Users actifs qui ont opté-in pour le digest
  const users = await prisma.user.findMany({
    where: { notifyDigest: true, connectProfile: { isNot: null } },
    include: { connectProfile: true }
  });

  let sent = 0;
  for (const u of users) {
    if (!u.email) continue;

    const [topPosts, newPros, unmatchedConvs] = await Promise.all([
      prisma.connectPost.findMany({
        where: { createdAt: { gte: weekAgo }, moderationStatus: 'approved', visibility: 'public' },
        orderBy: { reactions: { _count: 'desc' } },
        take: 5,
        include: { author: { select: { name: true } } }
      }),
      prisma.connectProfile.findMany({
        where: { showInPro: true, country: u.connectProfile?.country, createdAt: { gte: weekAgo } },
        take: 3
      }),
      prisma.connectConversation.findMany({
        where: {
          OR: [{ user1Id: u.id }, { user2Id: u.id }],
          messages: { every: { senderId: { not: u.id } } }
        },
        take: 5
      })
    ]);

    if (topPosts.length === 0 && newPros.length === 0 && unmatchedConvs.length === 0) continue;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h1 style="color: #d61b80;">✨ Ton digest GLD Connect</h1>
        <p>Voici ce qui s'est passé cette semaine sur la communauté.</p>

        ${topPosts.length > 0 ? `
          <h2>📖 Témoignages les plus aimés</h2>
          <ul>${topPosts.map((p) => `<li><b>${p.author?.name || 'Membre'}</b> : ${p.text.slice(0, 100)}…</li>`).join('')}</ul>
        ` : ''}

        ${newPros.length > 0 ? `
          <h2>💼 ${newPros.length} nouveaux pros près de toi</h2>
          <ul>${newPros.map((p) => `<li><b>${p.displayName}</b> · ${p.proCategory || ''} · ${p.city || ''}</li>`).join('')}</ul>
        ` : ''}

        ${unmatchedConvs.length > 0 ? `
          <h2>💬 ${unmatchedConvs.length} conversations attendent ta réponse</h2>
        ` : ''}

        <hr style="margin: 24px 0; border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #666;">
          <a href="https://gld.pixeeplay.com/connect">Aller sur GLD Connect</a> ·
          <a href="https://gld.pixeeplay.com/mon-espace/notifications">Désabonner</a>
        </p>
      </div>
    `;

    try {
      const setting = await prisma.setting.findUnique({ where: { key: 'integrations.resend.apiKey' } }).catch(() => null);
      const apiKey = setting?.value || process.env.RESEND_API_KEY;
      if (!apiKey) continue;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'GLD Connect <connect@gld.pixeeplay.com>',
          to: u.email,
          subject: '✨ Ton digest hebdo GLD Connect',
          html
        })
      });
      sent++;
    } catch (e) {
      console.error('Digest fail for', u.email, e);
    }
  }

  return NextResponse.json({ ok: true, sent, total: users.length });
}
