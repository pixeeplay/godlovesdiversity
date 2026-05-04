import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setWebhook, deleteWebhook, getWebhookInfo, getBotInfo } from '@/lib/telegram-bot';
import { getSettings, setSetting } from '@/lib/settings';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/telegram/setup
 * Body: { action: 'install' | 'uninstall' | 'rotate-secret' }
 * Configure le webhook auprès de Telegram.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { action } = await req.json().catch(() => ({}));
  const origin = req.nextUrl.origin;
  const url = `${origin}/api/webhooks/telegram`;

  try {
    if (action === 'uninstall') {
      await deleteWebhook();
      return NextResponse.json({ ok: true, action: 'uninstalled' });
    }

    // install ou rotate-secret
    let cfg = await getSettings(['integrations.telegram.webhookSecret']);
    let secret = cfg['integrations.telegram.webhookSecret'];
    if (!secret || action === 'rotate-secret') {
      secret = crypto.randomBytes(32).toString('hex');
      await setSetting('integrations.telegram.webhookSecret', secret);
    }

    await setWebhook(url, secret);
    const info = await getWebhookInfo();
    const me = await getBotInfo();

    return NextResponse.json({
      ok: true,
      action: 'installed',
      bot: me,
      webhook: { url, ...info }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erreur setup' }, { status: 500 });
  }
}
