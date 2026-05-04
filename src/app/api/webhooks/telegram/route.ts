import { NextRequest, NextResponse } from 'next/server';
import { handleCommand, handleCallback, type TgUpdate } from '@/lib/telegram-commands';
import { isAllowedUser, answerCallbackQuery, sendMessage } from '@/lib/telegram-bot';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Webhook Telegram — appelé par Telegram à chaque message reçu / clic sur bouton.
 *
 * Sécurité :
 *  - Vérifie le header X-Telegram-Bot-Api-Secret-Token (si configuré dans setWebhook)
 *  - Filtre par whitelist user_id (Settings → integrations.telegram.allowedUserIds)
 *
 * Setup : POST /api/admin/telegram/setup pour enregistrer le webhook auprès de Telegram.
 */
export async function POST(req: NextRequest) {
  // 1. Vérifier le secret token (anti-spoofing)
  const expectedSecret = (await getSettings(['integrations.telegram.webhookSecret']).catch(() => ({} as Record<string, string>)))['integrations.telegram.webhookSecret']
    || process.env.TELEGRAM_WEBHOOK_SECRET;
  const providedSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (expectedSecret && expectedSecret !== providedSecret) {
    // On accuse réception 200 quand même pour ne pas générer de retry Telegram
    console.warn('[Telegram webhook] Secret mismatch — ignored');
    return NextResponse.json({ ok: true, ignored: 'bad-secret' });
  }

  let update: TgUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalide' }, { status: 400 });
  }

  try {
    // 2a. Message texte
    if (update.message?.text) {
      const m = update.message;
      const userId = m.from?.id;
      if (userId && !(await isAllowedUser(userId))) {
        // Utilisateur non autorisé — silence radio (ou message poli)
        const username = m.from?.username || m.from?.first_name || 'inconnu';
        await sendMessage(m.chat.id,
          `🚫 Cet utilisateur (<code>${userId}</code> @${username}) n'est pas autorisé à utiliser ce bot.\n\nDemande à un admin GLD d'ajouter ton user_id à la whitelist.`);
        return NextResponse.json({ ok: true });
      }

      const text = m.text.trim();
      // On ne traite que les commandes (commencent par /) ou texte préfixé "@gld"
      if (text.startsWith('/')) {
        await handleCommand(m.chat.id, userId || 0, text);
      }
      return NextResponse.json({ ok: true });
    }

    // 2b. Click sur bouton inline
    if (update.callback_query) {
      const cq = update.callback_query;
      const userId = cq.from.id;
      if (!(await isAllowedUser(userId))) {
        await answerCallbackQuery(cq.id, '🚫 Non autorisé', true);
        return NextResponse.json({ ok: true });
      }
      const chatId = cq.message?.chat.id;
      if (chatId && cq.data) {
        const result = await handleCallback(chatId, userId, cq.data, cq.id);
        await answerCallbackQuery(cq.id, result.alert);
      } else {
        await answerCallbackQuery(cq.id);
      }
      return NextResponse.json({ ok: true });
    }

    // 3. Update non géré (ex: bot ajouté au groupe, edit message, etc.) — accusé réception
    return NextResponse.json({ ok: true, type: 'unhandled' });
  } catch (e: any) {
    console.error('[Telegram webhook]', e?.message);
    // Toujours retourner 200 pour éviter les retry Telegram en boucle
    return NextResponse.json({ ok: true, error: e?.message });
  }
}
