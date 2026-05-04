import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBotInfo, getWebhookInfo } from '@/lib/telegram-bot';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const cfg = await getSettings([
    'integrations.telegram.botToken',
    'integrations.telegram.chatId',
    'integrations.telegram.groupChatId',
    'integrations.telegram.allowedUserIds',
    'integrations.telegram.webhookSecret'
  ]);

  const hasToken = !!cfg['integrations.telegram.botToken'];

  let bot: any = null;
  let webhook: any = null;
  let error: string | null = null;

  if (hasToken) {
    try {
      bot = await getBotInfo();
      webhook = await getWebhookInfo();
    } catch (e: any) {
      error = e?.message || 'erreur Telegram API';
    }
  }

  return NextResponse.json({
    hasToken,
    bot,
    webhook,
    error,
    config: {
      hasGroupChatId: !!cfg['integrations.telegram.groupChatId'],
      hasChatId: !!cfg['integrations.telegram.chatId'],
      hasWhitelist: !!cfg['integrations.telegram.allowedUserIds'],
      whitelistCount: (cfg['integrations.telegram.allowedUserIds'] || '').split(',').filter(Boolean).length,
      hasWebhookSecret: !!cfg['integrations.telegram.webhookSecret']
    }
  });
}
