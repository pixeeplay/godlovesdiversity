import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/telegram/send
 * Body: { chatId?, text, parseMode? }
 * Envoie un message Telegram et l'enregistre dans TelegramAlert.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { text, chatId: explicitChatId, parseMode } = await req.json();
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Texte requis' }, { status: 400 });
    }
    const token = await getOrgSecret(auth.membership.org.id, 'TELEGRAM_BOT_TOKEN');
    if (!token) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN non configuré' }, { status: 400 });

    const chatId = explicitChatId || (await getOrgSecret(auth.membership.org.id, 'TELEGRAM_CHAT_ID'));
    if (!chatId) return NextResponse.json({ error: 'Aucun chatId configuré' }, { status: 400 });

    const db = await getTenantPrisma(slug);
    const alert = await (db as any).telegramAlert.create({
      data: { chatId: String(chatId), message: text, parseMode: parseMode || 'HTML', status: 'pending' },
    }).catch(() => null);

    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode || 'HTML' }),
    });
    const j = await r.json();
    if (alert) {
      await (db as any).telegramAlert.update({
        where: { id: alert.id },
        data: { status: r.ok ? 'sent' : 'failed', sentAt: new Date(), error: r.ok ? null : (j.description || `HTTP ${r.status}`) },
      }).catch(() => {});
    }
    if (!r.ok) return NextResponse.json({ error: j.description || 'Erreur Telegram' }, { status: 500 });
    return NextResponse.json({ ok: true, alert });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
