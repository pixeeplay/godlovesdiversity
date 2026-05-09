import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 320;

/**
 * Demande une approbation Telegram pour une action critique.
 *
 * POST { sessionId?, action, description, context?, timeoutSec? }
 *   1. Crée un ClaudeApproval pending
 *   2. Envoie message Telegram avec inline keyboard ✅ Approve / ❌ Reject
 *   3. Long-poll en attendant la réponse (max timeoutSec, défaut 5 min)
 *   4. Retourne { status: 'approved' | 'rejected' | 'timeout' }
 *
 * Le webhook /api/telegram/webhook capture la réponse user et update la row.
 */

async function requireAuthOrServiceCall(req: NextRequest) {
  // Permet aussi l'appel depuis Claude SDK avec un secret bypass
  const claudeSecret = req.headers.get('x-claude-secret');
  if (claudeSecret && claudeSecret === await getSecret('CLAUDE_AUTOPILOT_SECRET')) return { ok: true };

  const s = await getServerSession(authOptions);
  if (!s) return null;
  if ((s.user as any)?.role !== 'ADMIN') return null;
  return s;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthOrServiceCall(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = (body.action as string)?.trim();
  const description = (body.description as string)?.trim();
  const sessionId = (body.sessionId as string) || null;
  const context = body.context || null;
  const timeoutSec = Math.min(600, Math.max(30, Number(body.timeoutSec) || 300));

  if (!action || !description) {
    return NextResponse.json({ error: 'action-and-description-required' }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + timeoutSec * 1000);
  const approval = await prisma.claudeApproval.create({
    data: { sessionId, action, description, context, expiresAt }
  });

  // Envoie sur Telegram
  const sent = await sendTelegramApprovalRequest(approval.id, action, description);
  if (sent.messageId) {
    await prisma.claudeApproval.update({
      where: { id: approval.id },
      data: { telegramMessageId: String(sent.messageId) }
    });
  }

  // Long-poll : check toutes les 2s jusqu'à expiresAt ou status != pending
  const start = Date.now();
  while (Date.now() < expiresAt.getTime()) {
    await new Promise((r) => setTimeout(r, 2000));
    const row = await prisma.claudeApproval.findUnique({ where: { id: approval.id }, select: { status: true, decidedBy: true, decidedAt: true } });
    if (!row || row.status !== 'pending') {
      return NextResponse.json({
        ok: true,
        status: row?.status || 'unknown',
        decidedBy: row?.decidedBy,
        decidedAt: row?.decidedAt,
        approvalId: approval.id,
        elapsedMs: Date.now() - start
      });
    }
  }

  // Timeout
  await prisma.claudeApproval.update({ where: { id: approval.id }, data: { status: 'timeout' } });
  return NextResponse.json({ ok: true, status: 'timeout', approvalId: approval.id });
}

async function sendTelegramApprovalRequest(approvalId: string, action: string, description: string): Promise<{ messageId?: number; error?: string }> {
  const token = await getSecret('TELEGRAM_BOT_TOKEN');
  const chatId = await getSecret('TELEGRAM_ADMIN_CHAT_ID');
  if (!token || !chatId) return { error: 'telegram-not-configured' };

  const text = `🤖 *Claude Autopilot — validation requise*\n\n*Action :* \`${action}\`\n\n${description}\n\n_ID: ${approvalId}_\n_Tu peux aussi répondre /approve ${approvalId} ou /reject ${approvalId}_`;

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Approuver', callback_data: `claude_approve:${approvalId}` },
            { text: '❌ Rejeter', callback_data: `claude_reject:${approvalId}` }
          ]]
        }
      }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!r.ok) {
      console.warn('[telegram] sendMessage failed', await r.text().catch(() => ''));
      return { error: `http-${r.status}` };
    }
    const j: any = await r.json();
    return { messageId: j?.result?.message_id };
  } catch (e: any) {
    console.warn('[telegram] sendMessage network error', e?.message);
    return { error: e?.message };
  }
}

/** GET /api/admin/telegram/ask-approval — liste les approvals pending (debug) */
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s || (s.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const approvals = await prisma.claudeApproval.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30
  });
  return NextResponse.json({ ok: true, approvals });
}
