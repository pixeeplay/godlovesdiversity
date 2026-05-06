import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { moderateText } from '@/lib/ai-moderation';
import { getAiConfig, isEnabled, AI_KEYS } from '@/lib/ai-autopilot';
import { notify } from '@/lib/notify';

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

    // Témoignages restent en statut "pending" (revue admin manuelle systématique)
    // mais on lance modération IA sur le titre + nom pour pré-flagger les obvious red flags
    let preflag: { score: number; category: string; reason?: string } | null = null;
    try {
      const cfg = await getAiConfig();
      if (isEnabled(cfg, AI_KEYS.modEnabled) && (title || authorName)) {
        const checkText = [title, authorName].filter(Boolean).join('\n');
        if (checkText.length > 5) {
          const r = await moderateText(checkText, { targetType: 'testimony', targetId: 'pending' });
          preflag = { score: r.score, category: r.category, reason: r.reason };
          // Si haute toxicité sur le TITRE, alerte admin direct
          if (r.score >= 0.7 && r.category !== 'safe' && isEnabled(cfg, AI_KEYS.modNotifyAdmin)) {
            notify({
              event: 'admin.alert',
              title: '⚠️ Témoignage suspect (à modérer)',
              body: `Auteur : ${authorName || 'anonyme'}\nTitre : "${title || '—'}"\nCatégorie IA : ${r.category} · ${Math.round(r.score * 100)}%`,
              url: 'https://gld.pixeeplay.com/admin/testimonies',
              level: 'warning',
              metadata: { authorEmail, videoUrl, score: r.score }
            }).catch(() => {});
          }
        }
      }
    } catch {}

    const t = await prisma.videoTestimony.create({
      data: { authorName, authorEmail, videoUrl, thumbnailUrl, duration, locale: locale || 'fr', title, status: 'pending' }
    });
    return NextResponse.json({ testimony: t, preflag });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
