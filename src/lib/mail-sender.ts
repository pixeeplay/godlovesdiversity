import { prisma } from './prisma';

/**
 * Envoie un email — utilise Gmail SMTP si configuré, sinon Resend.
 * Compatible avec n'importe quel serveur SMTP (Gmail, Migadu, Mailcow, etc.).
 */
export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<{ ok: boolean; provider: string; error?: string }> {
  const settings = await loadMailSettings();

  // 1. Tente SMTP custom (Gmail / Migadu / autre) si configuré
  if (settings.smtpHost && settings.smtpUser && settings.smtpPassword) {
    try {
      await sendViaSmtp({ ...opts, from: opts.from || settings.smtpFrom || settings.smtpUser, settings });
      return { ok: true, provider: 'smtp' };
    } catch (e: any) {
      // Si SMTP échoue → fallback Resend
      console.error('SMTP failed, fallback to Resend:', e?.message);
    }
  }

  // 2. Fallback Resend
  if (settings.resendKey) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${settings.resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: opts.from || settings.resendFrom || 'GLD <noreply@gld.pixeeplay.com>',
          to: Array.isArray(opts.to) ? opts.to : [opts.to],
          subject: opts.subject,
          html: opts.html,
          text: opts.text
        })
      });
      const j = await r.json();
      if (!r.ok) return { ok: false, provider: 'resend', error: j.message || `HTTP ${r.status}` };
      return { ok: true, provider: 'resend' };
    } catch (e: any) {
      return { ok: false, provider: 'resend', error: e?.message };
    }
  }

  return { ok: false, provider: 'none', error: 'Aucun provider mail configuré (SMTP ni Resend)' };
}

async function loadMailSettings() {
  const keys = [
    'mail.smtp.host', 'mail.smtp.port', 'mail.smtp.user', 'mail.smtp.password', 'mail.smtp.from',
    'integrations.resend.apiKey', 'integrations.resend.from'
  ];
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } }).catch(() => []);
  const m = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    smtpHost: m['mail.smtp.host'] || process.env.SMTP_HOST,
    smtpPort: parseInt(m['mail.smtp.port'] || process.env.SMTP_PORT || '587'),
    smtpUser: m['mail.smtp.user'] || process.env.SMTP_USER,
    smtpPassword: m['mail.smtp.password'] || process.env.SMTP_PASSWORD,
    smtpFrom: m['mail.smtp.from'] || process.env.SMTP_FROM,
    resendKey: m['integrations.resend.apiKey'] || process.env.RESEND_API_KEY,
    resendFrom: m['integrations.resend.from'] || process.env.RESEND_FROM
  };
}

/**
 * Envoi SMTP via API Nodemailer.
 * Pour ne pas ajouter de dépendance lourde, on utilise un appel HTTP minimaliste vers
 * un service SMTP-over-HTTP (ou plus tard nodemailer si on l'ajoute aux deps).
 *
 * Pour MVP : on utilise nodemailer si installé, sinon on throw.
 */
async function sendViaSmtp(opts: any) {
  // Import dynamique pour éviter d'imposer la dépendance si non utilisée
  let nodemailer: any;
  try { nodemailer = await import('nodemailer'); } catch {
    throw new Error('nodemailer non installé — npm install nodemailer pour activer SMTP');
  }
  const transporter = nodemailer.default.createTransport({
    host: opts.settings.smtpHost,
    port: opts.settings.smtpPort,
    secure: opts.settings.smtpPort === 465,
    auth: { user: opts.settings.smtpUser, pass: opts.settings.smtpPassword }
  });
  await transporter.sendMail({
    from: opts.from,
    to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text
  });
}
