import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook Telegram — reçoit les callbacks des inline keyboards et les commandes.
 *
 * Configure le webhook une seule fois :
 *   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://gld.pixeeplay.com/api/telegram/webhook&secret_token=<SECRET>"
 *
 * Commandes supportées :
 *   /approve <approvalId> — valide une demande Claude Autopilot
 *   /reject <approvalId>  — rejette
 *   Inline buttons        — claude_approve:<id> / claude_reject:<id>
 */

export async function POST(req: NextRequest) {
  // Vérifie le secret du webhook (configuré côté Telegram)
  const wantSecret = await getSecret('TELEGRAM_WEBHOOK_SECRET');
  if (wantSecret) {
    const got = req.headers.get('x-telegram-bot-api-secret-token');
    if (got !== wantSecret) {
      return NextResponse.json({ error: 'invalid-secret' }, { status: 403 });
    }
  }

  const update = await req.json().catch(() => null);
  if (!update) return NextResponse.json({ ok: true });

  try {
    // Inline keyboard callback
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data as string;
      const userName = cq.from?.username || cq.from?.first_name || 'unknown';
      const messageId = cq.message?.message_id;
      const chatId = cq.message?.chat?.id;

      if (data?.startsWith('claude_approve:') || data?.startsWith('claude_reject:')) {
        const [action, id] = data.split(':');
        const status = action === 'claude_approve' ? 'approved' : 'rejected';

        const ap = await prisma.claudeApproval.findUnique({ where: { id } }).catch(() => null);
        if (!ap || ap.status !== 'pending') {
          await answerCallback(cq.id, ap ? `Déjà ${ap.status}` : 'Inconnu', true);
          return NextResponse.json({ ok: true });
        }

        await prisma.claudeApproval.update({
          where: { id },
          data: { status, decidedBy: userName, decidedAt: new Date() }
        });

        await answerCallback(cq.id, status === 'approved' ? '✅ Approuvé' : '❌ Rejeté');
        // Edite le message pour afficher la décision
        if (chatId && messageId) {
          await editMessage(chatId, messageId, ap.description, status, userName);
        }
        return NextResponse.json({ ok: true, status });
      }
    }

    // Commandes texte /approve <id> ou /reject <id>
    if (update.message?.text) {
      const text = update.message.text as string;
      const m = text.match(/^\/(approve|reject)\s+([\w-]+)/i);
      if (m) {
        const action = m[1].toLowerCase();
        const id = m[2];
        const status = action === 'approve' ? 'approved' : 'rejected';
        const userName = update.message.from?.username || update.message.from?.first_name || 'unknown';

        const ap = await prisma.claudeApproval.findUnique({ where: { id } }).catch(() => null);
        if (ap?.status === 'pending') {
          await prisma.claudeApproval.update({
            where: { id },
            data: { status, decidedBy: userName, decidedAt: new Date() }
          });
          await sendMessage(update.message.chat.id, `✅ Approval ${id} → *${status}*`);
        } else {
          await sendMessage(update.message.chat.id, ap ? `Approval ${id} déjà ${ap.status}` : `Approval ${id} introuvable`);
        }
      }
    }
  } catch (e) {
    console.error('[telegram-webhook] error', e);
  }

  return NextResponse.json({ ok: true });
}

async function answerCallback(callbackQueryId: string, text: string, alert = false) {
  const token = await getSecret('TELEGRAM_BOT_TOKEN');
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: alert }),
    signal: AbortSignal.timeout(5_000)
  }).catch(() => {});
}

async function editMessage(chatId: number, messageId: number, originalDesc: string, status: string, by: string) {
  const token = await getSecret('TELEGRAM_BOT_TOKEN');
  if (!token) return;
  const newText = `${originalDesc}\n\n— ${status === 'approved' ? '✅ *APPROUVÉ*' : '❌ *REJETÉ*'} par @${by}`;
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: newText,
      parse_mode: 'Markdown'
    }),
    signal: AbortSignal.timeout(5_000)
  }).catch(() => {});
}

async function sendMessage(chatId: number, text: string) {
  const token = await getSecret('TELEGRAM_BOT_TOKEN');
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    signal: AbortSignal.timeout(5_000)
  }).catch(() => {});
}

/** GET — health check */
export async function GET() {
  return NextResponse.json({ ok: true, message: 'Telegram webhook endpoint. POST only.' });
}
