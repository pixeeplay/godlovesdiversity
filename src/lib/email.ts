/**
 * Envoi d'email — stratégie :
 * - Si une clé Resend est configurée (BO ou .env) → Resend (HTTPS API)
 * - Sinon → SMTP local (Mailpit en dev)
 *
 * Tous les envois sont loggés dans EmailLog pour diagnostic.
 */
import nodemailer from 'nodemailer';
import { getSettings } from './settings';
import { prisma } from './prisma';

type EmailType = 'transactional' | 'newsletter' | 'confirmation' | 'test' | 'admin-notify';

async function loadConfig() {
  const db = await getSettings([
    'integrations.resend.apiKey',
    'integrations.resend.from',
    'integrations.admin.email'
  ]).catch(() => ({} as Record<string, string>));
  return {
    resendKey: db['integrations.resend.apiKey'] || process.env.RESEND_API_KEY,
    from: db['integrations.resend.from'] || process.env.EMAIL_FROM || '"parislgbt" <hello@parislgbt.com>',
    adminEmail: db['integrations.admin.email'] || process.env.ADMIN_EMAIL
  };
}

async function viaSmtp(from: string, to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mailpit',
    port: Number(process.env.SMTP_PORT || 1025),
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
  return transporter.sendMail({ from, to, subject, html });
}

async function viaResend(key: string, from: string, to: string, subject: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to, subject, html })
  });
  const text = await r.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!r.ok) {
    const msg = body?.message || body?.error || `HTTP ${r.status}`;
    throw new Error(`Resend ${r.status}: ${msg}`);
  }
  return body;
}

/**
 * Envoie un email et le logge automatiquement dans EmailLog.
 * @param to destinataire
 * @param subject objet
 * @param html corps HTML
 * @param opts options additionnelles (type, campaignId)
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  opts: { type?: EmailType; campaignId?: string } = {}
) {
  const { resendKey, from } = await loadConfig();
  const provider = resendKey ? 'resend' : 'smtp';
  const type = opts.type || 'transactional';

  // Crée l'entrée de log immédiatement (status pending)
  const log = await prisma.emailLog.create({
    data: {
      to, fromAddr: from, subject, type, provider,
      status: 'pending', campaignId: opts.campaignId
    }
  }).catch(() => null);

  try {
    let result: any;
    if (resendKey) {
      result = await viaResend(resendKey, from, to, subject, html);
    } else {
      result = await viaSmtp(from, to, subject, html);
    }
    if (log) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: 'sent',
          providerId: result?.id || result?.messageId || null
        }
      }).catch(() => {});
    }
    return result;
  } catch (e: any) {
    if (log) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'failed', errorMessage: e?.message || String(e) }
      }).catch(() => {});
    }
    throw e;
  }
}

export async function notifyAdmin(subject: string, html: string) {
  const { adminEmail } = await loadConfig();
  if (!adminEmail) return;
  return sendEmail(adminEmail, `[GLD] ${subject}`, html, { type: 'admin-notify' });
}

/* ─── DIAGNOSTIC ───────────────────────────────────────── */

export async function getEmailDiagnostic() {
  const cfg = await loadConfig();
  return {
    resendConfigured: !!cfg.resendKey,
    resendKeyMask: cfg.resendKey ? cfg.resendKey.slice(0, 6) + '…' + cfg.resendKey.slice(-4) : null,
    fromAddress: cfg.from,
    adminEmail: cfg.adminEmail || null,
    provider: cfg.resendKey ? 'resend' : 'smtp'
  };
}
