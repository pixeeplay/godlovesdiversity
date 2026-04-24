/**
 * Envoi d'email — stratégie :
 * - Si une clé Resend est configurée (BO ou .env) → Resend (HTTPS API)
 * - Sinon → SMTP local (Mailpit en dev)
 */
import nodemailer from 'nodemailer';
import { getSettings } from './settings';

async function loadConfig() {
  const db = await getSettings([
    'integrations.resend.apiKey',
    'integrations.resend.from',
    'integrations.admin.email'
  ]).catch(() => ({} as Record<string, string>));
  return {
    resendKey: db['integrations.resend.apiKey'] || process.env.RESEND_API_KEY,
    from: db['integrations.resend.from'] || process.env.EMAIL_FROM || '"God Loves Diversity" <hello@godlovesdiversity.com>',
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
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function sendEmail(to: string, subject: string, html: string) {
  const { resendKey, from } = await loadConfig();
  if (resendKey) return viaResend(resendKey, from, to, subject, html);
  return viaSmtp(from, to, subject, html);
}

export async function notifyAdmin(subject: string, html: string) {
  const { adminEmail } = await loadConfig();
  if (!adminEmail) return;
  return sendEmail(adminEmail, `[GLD] ${subject}`, html);
}
