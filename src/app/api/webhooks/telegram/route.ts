import { NextRequest, NextResponse } from 'next/server';
import { handleCommand, handleCallback, type TgUpdate } from '@/lib/telegram-commands';
import { isAllowedUser, answerCallbackQuery, sendMessage } from '@/lib/telegram-bot';
import { getSettings } from '@/lib/settings';
import { interpretNaturalMessage } from '@/lib/telegram-ai-router';
import { logIncoming } from '@/lib/telegram-log';

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
    // 2a-bis. Voice/Photo/Video → upload média
    if ((update.message as any)?.voice || (update.message as any)?.photo || (update.message as any)?.video) {
      const m = update.message as any;
      if (m.from?.id && (await isAllowedUser(m.from.id))) {
        try {
          const { prisma } = await import('@/lib/prisma');
          if (m.voice) {
            await prisma.videoTestimony.create({ data: {
              title: m.caption || `Voix ${new Date().toISOString().slice(0,10)}`,
              authorName: m.from?.first_name || 'Telegram',
              videoUrl: `tg://voice/${m.voice.file_id}`,
              transcription: m.caption || '',
              status: 'pending' as any
            }}).catch(() => null);
            await sendMessage(m.chat.id, `🎙 <b>Voix reçue !</b> ${m.voice.duration}s — modération admin en attente, sera dans le podcast RSS Spotify une fois approuvé.`);
          } else if (m.photo) {
            const photo = m.photo[m.photo.length - 1];
            await prisma.photo.create({ data: {
              imageKey: `tg/${photo.file_id}`,
              originalUrl: `tg://photo/${photo.file_id}`,
              thumbnailKey: `tg/${photo.file_id}_t`,
              authorName: m.from?.first_name || 'Telegram',
              caption: m.caption || null,
              status: 'PENDING' as any,
              source: 'TELEGRAM' as any,
              consentGiven: true,
              consentTimestamp: new Date()
            }}).catch(() => null);
            await sendMessage(m.chat.id, `📸 <b>Photo reçue !</b> En attente de modération — tape /photos pour la voir.`);
          } else if (m.video) {
            await prisma.videoTestimony.create({ data: {
              title: m.caption || `Vidéo ${new Date().toISOString().slice(0,10)}`,
              authorName: m.from?.first_name || 'Telegram',
              videoUrl: `tg://video/${m.video.file_id}`,
              transcription: m.caption || '',
              status: 'pending' as any
            }}).catch(() => null);
            await sendMessage(m.chat.id, `🎬 <b>Vidéo reçue !</b> ${Math.round(m.video.duration)}s — modération admin en attente.`);
          }
        } catch (e: any) {
          await sendMessage(m.chat.id, `⚠ Erreur upload : ${e.message}`);
        }
      }
      return NextResponse.json({ ok: true, type: 'media' });
    }

    // 2a. Message texte
    if (update.message?.text) {
      const m = update.message;
      const userId = m.from?.id;
      const baseLog = {
        chatId: m.chat.id,
        userId,
        username: m.from?.username,
        firstName: m.from?.first_name,
        text: m.text,
        raw: m
      };

      if (userId && !(await isAllowedUser(userId))) {
        const username = m.from?.username || m.from?.first_name || 'inconnu';
        await logIncoming({ ...baseLog, status: 'ignored', errorMessage: 'user not in whitelist' });
        await sendMessage(m.chat.id,
          `🚫 Cet utilisateur (<code>${userId}</code> @${username}) n'est pas autorisé à utiliser ce bot.\n\nDemande à un admin GLD d'ajouter ton user_id à la whitelist.`);
        return NextResponse.json({ ok: true });
      }

      const text = m.text.trim();

      // Commande explicite avec /
      if (text.startsWith('/')) {
        const cmd = text.split(/\s+/)[0].replace(/^\//, '').split('@')[0];
        await logIncoming({ ...baseLog, command: cmd });
        await handleCommand(m.chat.id, userId || 0, text);
        return NextResponse.json({ ok: true });
      }

      // Message naturel : on appelle l'AI router
      const intent = await interpretNaturalMessage(text);
      if (intent.matched) {
        await logIncoming({ ...baseLog, command: intent.command, aiInterpreted: true });
        // On notifie discrètement quelle commande l'IA a détectée
        await sendMessage(m.chat.id, `<i>🧠 J'ai compris : <b>/${intent.command}</b></i>`, { disable_notification: true });
        await handleCommand(m.chat.id, userId || 0, `/${intent.command}`);
      } else {
        await logIncoming({ ...baseLog, aiInterpreted: true, status: 'ignored', errorMessage: intent.reason });
        const sugg = intent.suggestion || 'Tape <code>/help</code> pour voir toutes les commandes disponibles.';
        await sendMessage(m.chat.id, `🤔 Je ne suis pas sûr de comprendre.\n\n${sugg}`);
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
        await logIncoming({ chatId, userId, callbackData: cq.data, raw: cq });
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
