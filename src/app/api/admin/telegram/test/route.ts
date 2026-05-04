import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendMessage, sendPhoto, getDefaultChatId, escHtml } from '@/lib/telegram-bot';
import type { TgInlineButton } from '@/lib/telegram-bot';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/telegram/test
 * Body: { test: 'ping' | 'order' | 'photo' | 'stats' | 'broadcast', chatId?: string }
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { test, chatId: explicitChatId } = await req.json();
  const chatId = explicitChatId || (await getDefaultChatId());
  if (!chatId) {
    return NextResponse.json({ error: 'Aucun chatId configuré. Renseigne integrations.telegram.groupChatId ou integrations.telegram.chatId.' }, { status: 400 });
  }

  try {
    switch (test) {
      case 'ping':
        await sendMessage(chatId, `🏓 <b>Pong de l'admin GLD</b>\n\nTimestamp : <code>${new Date().toISOString()}</code>\nLancé par : ${escHtml((s.user as any)?.email || 'admin')}\n\n✅ Le bot fonctionne et tu reçois bien les notifications.`);
        return NextResponse.json({ ok: true, sent: 'ping' });

      case 'order':
        await notify({
          event: 'order.created',
          title: `Test commande #DEMO1234`,
          body: `Sophie Martin · sophie@example.com · 47.80 € · 2 articles`,
          url: 'https://gld.pixeeplay.com/admin/shop',
          level: 'success'
        });
        return NextResponse.json({ ok: true, sent: 'fake-order via notify()' });

      case 'photo': {
        // Envoie une miniature avec boutons d'action
        const buttons: TgInlineButton[][] = [[
          { text: '✅ Approuver (test)', callback_data: 'approve:photo:DEMO_TEST_ID' },
          { text: '🚫 Refuser (test)', callback_data: 'reject:photo:DEMO_TEST_ID' }
        ]];
        await sendPhoto(
          chatId,
          'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400',
          '<b>Test modération photo</b>\nSi tu cliques sur ✅ ou 🚫, tu verras la confirmation arriver.',
          { inline_keyboard: buttons }
        );
        return NextResponse.json({ ok: true, sent: 'photo with buttons' });
      }

      case 'stats':
        await sendMessage(chatId, `📊 <b>Test stats</b>\n\nCe message simule ce que tu reçois quand tu tapes <code>/stats</code> au bot.\n\nPour le vrai test : <b>tape /stats</b> dans le chat.`);
        return NextResponse.json({ ok: true, sent: 'stats helper' });

      case 'broadcast':
        await sendMessage(chatId, `📢 <b>Broadcast de test</b>\n\nCe message a été envoyé en simulant un événement push (ex: alerte, notification globale).\n\n${chatId.toString().startsWith('-') ? 'Tous les membres du groupe le voient.' : 'Tu es en chat privé avec le bot.'}`);
        return NextResponse.json({ ok: true, sent: 'broadcast' });

      default:
        return NextResponse.json({ error: 'Test inconnu. Utilise: ping, order, photo, stats, broadcast' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erreur test' }, { status: 500 });
  }
}
