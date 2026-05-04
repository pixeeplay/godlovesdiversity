import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendMessage, getDefaultChatId } from '@/lib/telegram-bot';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/telegram/send
 * Body: { text: string, chatId?: string }
 * Envoie un message libre depuis l'admin vers Telegram.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { text, chatId: explicit } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Texte requis' }, { status: 400 });
    }
    const chatId = explicit || (await getDefaultChatId());
    if (!chatId) return NextResponse.json({ error: 'Aucun chatId configuré' }, { status: 400 });

    await sendMessage(chatId, text);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
