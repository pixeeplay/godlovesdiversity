import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * SMS code one-time pour actions critiques.
 *
 * POST /api/auth/sms-code?action=send     — envoie un code (Twilio)
 *   body: { phoneE164, purpose: 'login-2fa' | 'delete-admin' | 'role-change' }
 * POST /api/auth/sms-code?action=verify   — vérifie un code
 *   body: { phoneE164, code, purpose }
 *
 * Setup Twilio dans /admin/settings :
 *   integrations.twilio.accountSid
 *   integrations.twilio.authToken
 *   integrations.twilio.fromNumber  (ex +33XXXXXX, ou Messaging Service SID)
 */

const VALID_PURPOSES = ['login-2fa', 'delete-admin', 'role-change', 'phone-verify'];

async function getTwilioConfig() {
  const cfg = await getSettings([
    'integrations.twilio.accountSid',
    'integrations.twilio.authToken',
    'integrations.twilio.fromNumber'
  ]).catch(() => ({} as Record<string, string>));
  return {
    accountSid: cfg['integrations.twilio.accountSid'] || process.env.TWILIO_ACCOUNT_SID,
    authToken:  cfg['integrations.twilio.authToken']  || process.env.TWILIO_AUTH_TOKEN,
    fromNumber: cfg['integrations.twilio.fromNumber'] || process.env.TWILIO_FROM_NUMBER
  };
}

async function sendSmsViaTwilio(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getTwilioConfig();
  if (!cfg.accountSid || !cfg.authToken || !cfg.fromNumber) {
    return { ok: false, error: 'twilio-not-configured' };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;
  const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64');
  const params = new URLSearchParams({
    To: to,
    From: cfg.fromNumber,
    Body: body
  });
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    return { ok: false, error: `twilio-${r.status}: ${t.slice(0, 200)}` };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (s.user as any).id;
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const body = await req.json().catch(() => ({}));

  const phoneE164 = String(body.phoneE164 || '').replace(/[^\d+]/g, '');
  const purpose = VALID_PURPOSES.includes(body.purpose) ? body.purpose : null;
  if (!purpose) return NextResponse.json({ error: 'purpose-invalid' }, { status: 400 });

  if (action === 'send') {
    if (!/^\+\d{6,15}$/.test(phoneE164)) {
      return NextResponse.json({ error: 'phone-invalid', message: 'Format E.164 attendu (ex +33612345678)' }, { status: 400 });
    }
    const code = String(crypto.randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 10 * 60_000);

    await (prisma as any).smsCode.create({
      data: { userId, phoneE164, code, purpose, expiresAt }
    });

    const sms = await sendSmsViaTwilio(phoneE164, `Ton code GLD : ${code}\n\nExpire dans 10 min. Ne le partage avec personne.`);
    if (!sms.ok) {
      return NextResponse.json({
        error: 'sms-send-failed',
        message: sms.error,
        hint: sms.error === 'twilio-not-configured'
          ? 'Configure Twilio dans /admin/settings : integrations.twilio.accountSid + authToken + fromNumber'
          : sms.error
      }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: `✓ Code envoyé à ${phoneE164.replace(/(\+\d{2})(.{4}).+(\d{2})/, '$1$2…$3')}` });
  }

  if (action === 'verify') {
    const code = String(body.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'code-invalid' }, { status: 400 });
    }
    const record = await (prisma as any).smsCode.findFirst({
      where: { userId, phoneE164, code, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });
    if (!record) {
      return NextResponse.json({ error: 'code-invalid-or-expired' }, { status: 401 });
    }
    await (prisma as any).smsCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() }
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'action-unknown' }, { status: 400 });
}
