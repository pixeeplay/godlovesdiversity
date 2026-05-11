import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orgs/[slug]/telegram/info
 * Renvoie l'état du bot (getMe + getWebhookInfo) + config résumée.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const orgId = auth.membership.org.id;
  const token = await getOrgSecret(orgId, 'TELEGRAM_BOT_TOKEN');
  const chatId = await getOrgSecret(orgId, 'TELEGRAM_CHAT_ID');
  const webhookSecret = await getOrgSecret(orgId, 'TELEGRAM_WEBHOOK_SECRET');

  let bot: any = null;
  let webhook: any = null;
  let error: string | null = null;

  if (token) {
    try {
      const r1 = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const j1 = await r1.json();
      bot = j1.result || j1;
      const r2 = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const j2 = await r2.json();
      webhook = j2.result || j2;
    } catch (e: any) {
      error = e?.message || 'erreur Telegram API';
    }
  }

  return NextResponse.json({
    hasToken: !!token,
    bot,
    webhook,
    error,
    config: {
      hasChatId: !!chatId,
      hasGroupChatId: !!chatId && String(chatId).startsWith('-'),
      hasWhitelist: false,
      whitelistCount: 0,
      hasWebhookSecret: !!webhookSecret,
    },
  });
}
