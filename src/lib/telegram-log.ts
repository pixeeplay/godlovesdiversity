/**
 * Helpers pour logger tous les messages Telegram (in/out) en DB.
 * Utilisé par le webhook (in) et par sendMessage/sendPhoto (out).
 */
import { prisma } from './prisma';

export type TgLogIn = {
  chatId: string | number;
  userId?: number | string;
  username?: string;
  firstName?: string;
  text?: string;
  command?: string;
  aiInterpreted?: boolean;
  imageUrl?: string;
  callbackData?: string;
  status?: 'delivered' | 'failed' | 'ignored';
  errorMessage?: string;
  raw?: any;
};

export type TgLogOut = {
  chatId: string | number;
  text?: string;
  imageUrl?: string;
  status?: 'delivered' | 'failed';
  errorMessage?: string;
  raw?: any;
};

export async function logIncoming(data: TgLogIn): Promise<void> {
  try {
    await prisma.telegramMessage.create({
      data: {
        direction: 'in',
        chatId: String(data.chatId),
        userId: data.userId ? String(data.userId) : null,
        username: data.username || null,
        firstName: data.firstName || null,
        text: data.text || null,
        command: data.command || null,
        aiInterpreted: !!data.aiInterpreted,
        imageUrl: data.imageUrl || null,
        callbackData: data.callbackData || null,
        status: data.status || 'delivered',
        errorMessage: data.errorMessage || null,
        raw: data.raw || undefined
      }
    });
  } catch (e) {
    console.warn('[telegram-log:in]', (e as any)?.message);
  }
}

export async function logOutgoing(data: TgLogOut): Promise<void> {
  try {
    await prisma.telegramMessage.create({
      data: {
        direction: 'out',
        chatId: String(data.chatId),
        text: data.text || null,
        imageUrl: data.imageUrl || null,
        status: data.status || 'delivered',
        errorMessage: data.errorMessage || null,
        raw: data.raw || undefined
      }
    });
  } catch (e) {
    console.warn('[telegram-log:out]', (e as any)?.message);
  }
}
