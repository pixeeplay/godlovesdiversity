import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/telegram/test
 * Body: { test: 'ping' | 'order' | 'photo' | 'stats' | 'broadcast', chatId? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const orgId = auth.membership.org.id;
  const { test, chatId: explicitChatId } = await req.json();
  const token = await getOrgSecret(orgId, 'TELEGRAM_BOT_TOKEN');
  if (!token) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN non configuré' }, { status: 400 });
  const chatId = explicitChatId || (await getOrgSecret(orgId, 'TELEGRAM_CHAT_ID'));
  if (!chatId) return NextResponse.json({ error: 'Aucun chatId configuré' }, { status: 400 });

  const userEmail = (auth.user as any)?.email || 'admin';

  let text = '';
  let extra: any = {};
  switch (test) {
    case 'ping':
      text = `🏓 <b>Pong de Pixeesite</b>\n\nTimestamp : <code>${new Date().toISOString()}</code>\nLancé par : ${userEmail}\n\n✅ Le bot fonctionne et tu reçois bien les notifications.`;
      break;
    case 'order':
      text = `🛍️ <b>Nouvelle commande #DEMO1234</b>\n\nSophie Martin · sophie@example.com\n47.80 € · 2 articles`;
      break;
    case 'photo':
      // Photo via sendPhoto
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400',
            caption: '<b>Test modération photo</b>',
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[
              { text: '✅ Approuver (test)', callback_data: 'approve:photo:DEMO' },
              { text: '🚫 Refuser (test)', callback_data: 'reject:photo:DEMO' },
            ]] },
          }),
        });
        const j = await r.json();
        if (!r.ok) return NextResponse.json({ error: j.description }, { status: 500 });
        return NextResponse.json({ ok: true, sent: 'photo' });
      } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
    case 'stats':
      text = `📊 <b>Test stats</b>\n\nCe message simule ce que tu reçois quand tu tapes <code>/stats</code> au bot.`;
      break;
    case 'broadcast':
      text = `📢 <b>Broadcast de test</b>\n\nCe message a été envoyé en simulant un événement push.`;
      break;
    default:
      return NextResponse.json({ error: 'Test inconnu. Utilise: ping, order, photo, stats, broadcast' }, { status: 400 });
  }

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    const j = await r.json();
    const db = await getTenantPrisma(slug);
    await (db as any).telegramAlert.create({
      data: { chatId: String(chatId), message: text, type: `test:${test}`, parseMode: 'HTML',
              status: r.ok ? 'sent' : 'failed', sentAt: new Date(), error: r.ok ? null : (j.description || `HTTP ${r.status}`) },
    }).catch(() => {});
    if (!r.ok) return NextResponse.json({ error: j.description }, { status: 500 });
    return NextResponse.json({ ok: true, sent: test });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
