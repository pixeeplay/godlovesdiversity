import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { moderateText } from '@/lib/ai-moderation';
import { getAiConfig, isEnabled, AI_KEYS } from '@/lib/ai-autopilot';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const posts = await prisma.forumPost.findMany({
      where: { threadId: id, status: 'active' },
      include: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'asc' }
    });
    await prisma.forumThread.update({ where: { id }, data: { viewsCount: { increment: 1 } } }).catch(() => null);
    return NextResponse.json({ posts });
  } catch (e: any) {
    return NextResponse.json({ posts: [], error: e?.message }, { status: 200 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { content, authorId, parentId } = await req.json();
    if (!content) return NextResponse.json({ error: 'content requis' }, { status: 400 });

    // Crée d'abord le post pour avoir un ID à passer au logger de modération
    const post = await prisma.forumPost.create({ data: { threadId: id, authorId, content, parentId } });

    // Modération IA (synchrone, ~1s) — feature toggle dans /admin/ai-autopilot
    let modResult: any = null;
    let hidden = false;
    try {
      const cfg = await getAiConfig();
      if (isEnabled(cfg, AI_KEYS.modEnabled)) {
        modResult = await moderateText(content, { targetType: 'forum_post', targetId: post.id });
        if (modResult.shouldHide) {
          await prisma.forumPost.update({ where: { id: post.id }, data: { status: 'hidden' } });
          hidden = true;
          // Notif admin si activé
          if (isEnabled(cfg, AI_KEYS.modNotifyAdmin)) {
            notify({
              event: 'admin.alert',
              title: '⚠️ Post forum masqué par IA',
              body: `Catégorie : ${modResult.category} · Score ${Math.round(modResult.score * 100)}%\n\n"${content.slice(0, 200)}"\n\n${modResult.reason || ''}`,
              url: `https://gld.pixeeplay.com/admin/forum`,
              level: 'warning',
              metadata: { postId: post.id, threadId: id, category: modResult.category, score: modResult.score }
            }).catch(() => {});
          }
        }
      }
    } catch {}

    // Si le post n'est PAS hidden, met à jour les stats du thread
    if (!hidden) {
      await prisma.forumThread.update({
        where: { id },
        data: { postsCount: { increment: 1 }, lastReplyAt: new Date() }
      });
    }

    // Renvoie au client : message clair si caché
    if (hidden) {
      return NextResponse.json({
        post: { ...post, status: 'hidden' },
        moderation: { hidden: true, category: modResult.category, score: modResult.score, reason: modResult.reason || 'Contenu jugé non conforme' }
      }, { status: 202 });
    }
    return NextResponse.json({ post, moderation: modResult ? { hidden: false, score: modResult.score, category: modResult.category } : undefined });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
