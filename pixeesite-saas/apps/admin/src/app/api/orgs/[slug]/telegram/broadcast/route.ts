import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/telegram/broadcast
 * Body: { text, parseMode? }
 * Envoie le message à tous les chatIds distincts présents dans TelegramAlert.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { text, parseMode } = await req.json();
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Texte requis' }, { status: 400 });
    }
    const token = await getOrgSecret(auth.membership.org.id, 'TELEGRAM_BOT_TOKEN');
    if (!token) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN non configuré' }, { status: 400 });

    const db = await getTenantPrisma(slug);
    const distinct = await (db as any).telegramAlert.findMany({
      select: { chatId: true },
      distinct: ['chatId'],
      take: 1000,
    }).catch(() => []);

    const recipients: string[] = distinct.map((r: any) => r.chatId).filter(Boolean);
    if (recipients.length === 0) {
      // Fallback : envoi sur le chatId par défaut
      const def = await getOrgSecret(auth.membership.org.id, 'TELEGRAM_CHAT_ID');
      if (def) recipients.push(def);
    }
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'Aucun destinataire' }, { status: 400 });
    }

    let ok = 0, fail = 0;
    const errors: any[] = [];
    for (const chatId of recipients) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode || 'HTML' }),
        });
        if (r.ok) {
          ok++;
          await (db as any).telegramAlert.create({
            data: { chatId, message: text, type: 'broadcast', parseMode: parseMode || 'HTML', status: 'sent', sentAt: new Date() },
          }).catch(() => {});
        } else {
          fail++;
          const j = await r.json().catch(() => ({}));
          errors.push({ chatId, error: j.description || `HTTP ${r.status}` });
        }
      } catch (e: any) {
        fail++;
        errors.push({ chatId, error: e?.message });
      }
    }
    return NextResponse.json({ ok: true, sent: ok, failed: fail, total: recipients.length, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
