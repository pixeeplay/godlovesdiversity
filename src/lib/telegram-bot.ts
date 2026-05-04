/**
 * Wrapper Telegram Bot API.
 * Doc : https://core.telegram.org/bots/api
 *
 * Le token API est récupéré depuis Settings (integrations.telegram.botToken),
 * fallback env TELEGRAM_BOT_TOKEN.
 */
import { getSettings } from './settings';

const TG_BASE = 'https://api.telegram.org';

export type TgInlineButton = {
  text: string;
  callback_data?: string;  // payload renvoyé au bot quand on clique
  url?: string;             // ouvre une URL externe
};

type TgChatId = string | number;

async function getToken(): Promise<string | null> {
  const cfg = await getSettings(['integrations.telegram.botToken']).catch(() => ({} as Record<string, string>));
  return cfg['integrations.telegram.botToken'] || process.env.TELEGRAM_BOT_TOKEN || null;
}

async function call<T = any>(method: string, body?: any): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Telegram bot token non configuré (Paramètres → Telegram)');
  const r = await fetch(`${TG_BASE}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json();
  if (!j.ok) throw new Error(`Telegram ${method} : ${j.description || `HTTP ${r.status}`}`);
  return j.result as T;
}

// =================== INFO ===================

export async function getBotInfo() {
  return call('getMe');
}

export async function getWebhookInfo() {
  return call('getWebhookInfo');
}

// =================== ENVOI ===================

export async function sendMessage(chatId: TgChatId, text: string, opts?: {
  parse_mode?: 'HTML' | 'MarkdownV2';
  reply_to_message_id?: number;
  disable_notification?: boolean;
  inline_keyboard?: TgInlineButton[][];
  link_preview_options?: { is_disabled?: boolean };
}) {
  const body: any = { chat_id: chatId, text, parse_mode: opts?.parse_mode || 'HTML', link_preview_options: opts?.link_preview_options };
  if (opts?.reply_to_message_id) body.reply_to_message_id = opts.reply_to_message_id;
  if (opts?.disable_notification) body.disable_notification = true;
  if (opts?.inline_keyboard) body.reply_markup = { inline_keyboard: opts.inline_keyboard };
  return call('sendMessage', body);
}

export async function sendPhoto(chatId: TgChatId, photoUrl: string, caption?: string, opts?: {
  parse_mode?: 'HTML' | 'MarkdownV2';
  inline_keyboard?: TgInlineButton[][];
}) {
  const body: any = { chat_id: chatId, photo: photoUrl, caption, parse_mode: opts?.parse_mode || 'HTML' };
  if (opts?.inline_keyboard) body.reply_markup = { inline_keyboard: opts.inline_keyboard };
  return call('sendPhoto', body);
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false) {
  return call('answerCallbackQuery', { callback_query_id: callbackQueryId, text, show_alert: showAlert });
}

export async function editMessageText(chatId: TgChatId, messageId: number, text: string, opts?: {
  parse_mode?: 'HTML' | 'MarkdownV2';
  inline_keyboard?: TgInlineButton[][];
}) {
  const body: any = {
    chat_id: chatId, message_id: messageId, text,
    parse_mode: opts?.parse_mode || 'HTML',
    link_preview_options: { is_disabled: true }
  };
  if (opts?.inline_keyboard) body.reply_markup = { inline_keyboard: opts.inline_keyboard };
  return call('editMessageText', body);
}

// =================== WEBHOOK ===================

export async function setWebhook(url: string, secretToken?: string) {
  const body: any = { url, allowed_updates: ['message', 'callback_query'] };
  if (secretToken) body.secret_token = secretToken;
  return call('setWebhook', body);
}

export async function deleteWebhook() {
  return call('deleteWebhook');
}

// =================== HELPERS ===================

/** Échappe les caractères spéciaux HTML pour parse_mode HTML. */
export function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Récupère l'identifiant du chat principal pour les broadcasts (groupe ou chat 1-to-1). */
export async function getDefaultChatId(): Promise<string | null> {
  const cfg = await getSettings([
    'integrations.telegram.groupChatId',
    'integrations.telegram.chatId'
  ]).catch(() => ({} as Record<string, string>));
  return cfg['integrations.telegram.groupChatId'] || cfg['integrations.telegram.chatId'] || null;
}

/** Vérifie qu'un user_id Telegram est dans la whitelist. */
export async function isAllowedUser(userId: number | string): Promise<boolean> {
  const cfg = await getSettings(['integrations.telegram.allowedUserIds']).catch(() => ({} as Record<string, string>));
  const csv = cfg['integrations.telegram.allowedUserIds'] || '';
  if (!csv.trim()) return true; // pas de whitelist → tout le monde autorisé (mode permissif)
  const ids = csv.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.includes(String(userId));
}
