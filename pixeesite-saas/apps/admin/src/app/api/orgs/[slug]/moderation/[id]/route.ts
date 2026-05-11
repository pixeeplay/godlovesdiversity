import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function notifyTelegram(orgId: string, message: string) {
  const token = await getOrgSecret(orgId, 'TELEGRAM_BOT_TOKEN');
  const chatId = await getOrgSecret(orgId, 'TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    });
  } catch { /* swallow */ }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  const data: any = {};
  if (b.status) {
    data.status = b.status;
    data.decidedAt = new Date();
    data.decidedBy = (auth.user as any)?.email || (auth.user as any)?.id || 'admin';
  }
  if (b.reason !== undefined) data.reason = b.reason;
  const item = await (db as any).moderationItem.update({ where: { id }, data });

  if (b.status === 'rejected' || b.status === 'flagged') {
    notifyTelegram(auth.membership.org.id,
      `🚨 *Modération ${b.status.toUpperCase()}* sur _${slug}_\n` +
      `Type: ${item.type}\n` +
      `Auteur: ${item.authorName || item.authorEmail || 'anonyme'}\n` +
      `> ${(item.content || '').slice(0, 200)}`
    );
  }
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await (db as any).moderationItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
