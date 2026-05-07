import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/forum/moderate
 * Body: { threadId, action: 'approve' | 'reject', reason? }
 *
 * Approuve ou rejette un thread en `pending` (workflow requireAdminApproval).
 * Auth : ADMIN OU header X-Telegram-Callback-Secret (pour webhook bot).
 */

export async function POST(req: NextRequest) {
  // Auth : soit ADMIN session, soit secret Telegram bot
  const tgSecret = req.headers.get('x-telegram-callback-secret');
  const isTelegramBot = tgSecret && tgSecret === process.env.TELEGRAM_CALLBACK_SECRET;
  if (!isTelegramBot) {
    const s = await getServerSession(authOptions);
    if (!s?.user || (s.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const threadId = String(body.threadId || '');
  const action = body.action;
  const reason = String(body.reason || '').slice(0, 500);

  if (!threadId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    include: { category: true, author: { select: { id: true, name: true, email: true } } }
  });
  if (!thread) return NextResponse.json({ error: 'thread-not-found' }, { status: 404 });
  if (thread.status !== 'pending') {
    return NextResponse.json({ error: 'not-pending', currentStatus: thread.status }, { status: 400 });
  }

  if (action === 'approve') {
    await prisma.forumThread.update({
      where: { id: threadId },
      data: { status: 'active', lastReplyAt: new Date() }
    });
    await prisma.forumPost.updateMany({
      where: { threadId, status: 'pending' as any },
      data: { status: 'active' as any }
    }).catch(() => {});
    notify({
      event: 'admin.alert',
      title: '✅ Sujet forum approuvé',
      body: `"${thread.title}" est maintenant publié sur ${thread.category?.name || 'le forum'}.`,
      url: `https://gld.pixeeplay.com/forum/${thread.category?.slug}/${thread.slug}`,
      level: 'info'
    }).catch(() => {});
    return NextResponse.json({ ok: true, action: 'approved', threadId });
  }

  // reject
  await prisma.forumThread.update({
    where: { id: threadId },
    data: { status: 'hidden' }
  });
  notify({
    event: 'admin.alert',
    title: '❌ Sujet forum rejeté',
    body: `"${thread.title}" a été rejeté.${reason ? ` Raison : ${reason}` : ''}`,
    url: `https://gld.pixeeplay.com/admin/forum`,
    level: 'warning'
  }).catch(() => {});
  return NextResponse.json({ ok: true, action: 'rejected', threadId, reason });
}

/**
 * GET /api/admin/forum/moderate?status=pending
 * Liste les threads en attente de validation.
 */
export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const status = new URL(req.url).searchParams.get('status') || 'pending';
  const threads = await prisma.forumThread.findMany({
    where: { status },
    include: {
      category: { select: { name: true, slug: true } },
      author: { select: { name: true, email: true, image: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  return NextResponse.json({ threads });
}
