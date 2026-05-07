import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { moderateText } from '@/lib/ai-moderation';
import { getAiConfig, isEnabled, AI_KEYS } from '@/lib/ai-autopilot';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cat = req.nextUrl.searchParams.get('category');
  try {
    const threads = await prisma.forumThread.findMany({
      where: { status: 'active', ...(cat ? { category: { slug: cat } } : {}) },
      include: { category: true, author: { select: { id: true, name: true, image: true } } },
      orderBy: [{ pinned: 'desc' }, { lastReplyAt: 'desc' }, { createdAt: 'desc' }],
      take: 50
    });
    return NextResponse.json({ threads });
  } catch (e: any) {
    return NextResponse.json({ threads: [], error: e?.message }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, content, categoryId, authorId } = await req.json();
    if (!title || !content || !categoryId) {
      return NextResponse.json({ error: 'title, content, categoryId requis' }, { status: 400 });
    }

    // Charge la catégorie pour vérifier requireAdminApproval
    const category = await prisma.forumCategory.findUnique({
      where: { id: categoryId },
      select: { name: true, slug: true, requireAdminApproval: true, telegramAlertEnabled: true }
    });
    const requireApproval = (category as any)?.requireAdminApproval === true;

    const slug = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + Date.now().toString(36);
    const thread = await prisma.forumThread.create({
      data: {
        title, slug, categoryId, authorId,
        // Si la catégorie exige validation : status=pending dès le départ
        status: requireApproval ? 'pending' : 'active',
        lastReplyAt: new Date()
      }
    });
    const initialPost = await prisma.forumPost.create({
      data: {
        threadId: thread.id,
        authorId,
        content,
        ...(requireApproval ? { status: 'pending' as any } : {})
      }
    });

    // Si validation admin requise → notifie Telegram avec boutons inline approve/reject
    if (requireApproval && (category as any)?.telegramAlertEnabled !== false) {
      notify({
        event: 'admin.alert',
        title: `📬 Nouveau sujet en attente — ${category?.name || 'Forum'}`,
        body: `**${title}**\n\n${content.slice(0, 400)}${content.length > 400 ? '…' : ''}\n\nCatégorie : ${category?.name}\nStatut : ⏳ En attente de validation`,
        url: `https://gld.pixeeplay.com/admin/forum?pending=${thread.id}`,
        level: 'info',
        metadata: {
          threadId: thread.id,
          postId: initialPost.id,
          category: category?.slug,
          requireApproval: true,
          // Telegram inline buttons (le bot Telegram doit gérer ces callbacks)
          inlineButtons: [
            { text: '✅ Approuver', callback_data: `forum-approve:${thread.id}` },
            { text: '❌ Rejeter',   callback_data: `forum-reject:${thread.id}` },
            { text: '👁 Voir',      url: `https://gld.pixeeplay.com/admin/forum?pending=${thread.id}` }
          ]
        }
      }).catch(() => {});
    }

    // Modération IA — analyse SIMULTANÉMENT le titre + le contenu initial
    let hidden = false;
    let modResult: any = null;
    try {
      const cfg = await getAiConfig();
      if (isEnabled(cfg, AI_KEYS.modEnabled)) {
        // Combine titre + contenu pour 1 seul appel Gemini économique
        modResult = await moderateText(`${title}\n\n${content}`, { targetType: 'forum_thread', targetId: thread.id });
        if (modResult.shouldHide) {
          await prisma.forumThread.update({ where: { id: thread.id }, data: { status: 'hidden' } });
          await prisma.forumPost.update({ where: { id: initialPost.id }, data: { status: 'hidden' } });
          hidden = true;
          if (isEnabled(cfg, AI_KEYS.modNotifyAdmin)) {
            notify({
              event: 'admin.alert',
              title: '⚠️ Sujet forum masqué par IA',
              body: `Titre : "${title}"\nCatégorie modération : ${modResult.category} · Score ${Math.round(modResult.score * 100)}%\n\n${modResult.reason || ''}`,
              url: `https://gld.pixeeplay.com/admin/forum`,
              level: 'warning',
              metadata: { threadId: thread.id, postId: initialPost.id, category: modResult.category, score: modResult.score }
            }).catch(() => {});
          }
        }
      }
    } catch {}

    if (!hidden) {
      await prisma.forumThread.update({ where: { id: thread.id }, data: { postsCount: 1 } });
    }

    if (hidden) {
      return NextResponse.json({
        thread: { ...thread, status: 'hidden' },
        moderation: { hidden: true, category: modResult.category, score: modResult.score, reason: modResult.reason || 'Contenu jugé non conforme' }
      }, { status: 202 });
    }
    if (requireApproval) {
      return NextResponse.json({
        thread: { ...thread, status: 'pending' },
        pending: true,
        message: 'Ton sujet est en attente de validation par l\'équipe (notif Telegram envoyée). Tu seras notifié·e quand il sera publié.'
      }, { status: 202 });
    }
    return NextResponse.json({ thread, moderation: modResult ? { hidden: false, score: modResult.score, category: modResult.category } : undefined });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
