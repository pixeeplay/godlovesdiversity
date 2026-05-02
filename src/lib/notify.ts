/**
 * Système de notifications universelles : dispatche un événement vers tous
 * les connecteurs configurés (Telegram, Slack, Discord, Webhook générique).
 *
 * Usage :
 *   await notify({
 *     event: 'order.created',
 *     title: 'Nouvelle commande #ABCD1234',
 *     body: 'Sophie Martin · 47.80 €',
 *     url: 'https://gld.pixeeplay.com/admin/shop/orders/xxx'
 *   });
 *
 * Les erreurs sur 1 canal n'empêchent pas les autres → fire-and-forget safe.
 */
import { getSettings } from './settings';

export type NotifyEvent =
  | 'order.created' | 'order.shipped' | 'order.delivered'
  | 'photo.uploaded' | 'photo.approved' | 'photo.rejected'
  | 'newsletter.subscribed'
  | 'donation.received'
  | 'comment.posted'
  | 'admin.alert';

type NotifyPayload = {
  event: NotifyEvent;
  title: string;
  body: string;
  url?: string;
  level?: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
};

const EMOJI: Record<NotifyEvent, string> = {
  'order.created':         '🛒',
  'order.shipped':         '📦',
  'order.delivered':       '✅',
  'photo.uploaded':        '📸',
  'photo.approved':        '✨',
  'photo.rejected':        '🚫',
  'newsletter.subscribed': '💌',
  'donation.received':     '💖',
  'comment.posted':        '💬',
  'admin.alert':           '🚨'
};

export async function notify(payload: NotifyPayload): Promise<void> {
  const emoji = EMOJI[payload.event] || '🔔';
  const settings = await getSettings([
    'integrations.telegram.botToken', 'integrations.telegram.chatId',
    'integrations.slack.webhookUrl',
    'integrations.discord.webhookUrl',
    'integrations.webhook.url', 'integrations.webhook.secret'
  ]).catch(() => ({} as Record<string, string>));

  // Fire & forget — on attend pas chaque canal
  const tasks: Promise<any>[] = [];

  // ─── Telegram ───
  const tgToken = settings['integrations.telegram.botToken'];
  const tgChat = settings['integrations.telegram.chatId'];
  if (tgToken && tgChat) {
    const text = `${emoji} *${payload.title}*\n${payload.body}${payload.url ? `\n\n[Voir →](${payload.url})` : ''}`;
    tasks.push(fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: tgChat, text, parse_mode: 'Markdown', disable_web_page_preview: true })
    }).catch((e) => console.error('[notify telegram]', e.message)));
  }

  // ─── Slack ───
  const slack = settings['integrations.slack.webhookUrl'];
  if (slack) {
    tasks.push(fetch(slack, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} *${payload.title}*\n${payload.body}${payload.url ? `\n<${payload.url}|Voir →>` : ''}`
      })
    }).catch((e) => console.error('[notify slack]', e.message)));
  }

  // ─── Discord ───
  const discord = settings['integrations.discord.webhookUrl'];
  if (discord) {
    tasks.push(fetch(discord, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `${emoji} ${payload.title}`,
          description: payload.body,
          url: payload.url,
          color: payload.level === 'success' ? 0x10b981 : payload.level === 'warning' ? 0xf59e0b : payload.level === 'error' ? 0xef4444 : 0xff2bb1,
          timestamp: new Date().toISOString()
        }]
      })
    }).catch((e) => console.error('[notify discord]', e.message)));
  }

  // ─── Webhook générique (Zapier, Make, n8n, IFTTT, custom) ───
  const webhook = settings['integrations.webhook.url'];
  if (webhook) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (settings['integrations.webhook.secret']) {
      headers['X-Webhook-Secret'] = settings['integrations.webhook.secret'];
    }
    tasks.push(fetch(webhook, {
      method: 'POST', headers,
      body: JSON.stringify({ ...payload, emoji, timestamp: new Date().toISOString() })
    }).catch((e) => console.error('[notify webhook]', e.message)));
  }

  // On lance en parallèle, on n'attend pas le retour (fire-and-forget)
  Promise.all(tasks).catch(() => {});
}
