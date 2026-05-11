import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma, platformDb } from '@pixeesite/database';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/telegram/webhook
 * Endpoint public appelé par Telegram. Vérifie le secret via header
 * X-Telegram-Bot-Api-Secret-Token et enregistre l'update dans TelegramAlert.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const org = await platformDb.org.findUnique({ where: { slug }, select: { id: true } });
    if (!org) return NextResponse.json({ error: 'org not found' }, { status: 404 });

    const expected = await getOrgSecret(org.id, 'TELEGRAM_WEBHOOK_SECRET');
    const got = req.headers.get('x-telegram-bot-api-secret-token');
    if (expected && got !== expected) {
      return NextResponse.json({ error: 'invalid secret' }, { status: 401 });
    }

    const update = await req.json();
    const msg = update.message || update.callback_query?.message || update.edited_message;
    const chatId = String(msg?.chat?.id || update.callback_query?.from?.id || '');
    const text = msg?.text || update.callback_query?.data || '';

    if (chatId) {
      const db = await getTenantPrisma(slug);
      await (db as any).telegramAlert.create({
        data: {
          chatId,
          message: text || '(no text)',
          type: update.callback_query ? 'callback' : 'incoming',
          status: 'received',
          metadata: update,
        },
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
