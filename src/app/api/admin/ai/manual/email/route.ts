import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mail-sender';
import { getSettings, setSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90;

const KEYS = {
  enabled: 'ai.manual.email.enabled',
  recipient: 'ai.manual.email.recipient',
  audience: 'ai.manual.email.audience',         // user | admin | superadmin
  hour: 'ai.manual.email.hour',                 // 0-23, défaut 7
  lastSentAt: 'ai.manual.email.lastSentAt'
};

/**
 * GET /api/admin/ai/manual/email — config actuelle
 * POST /api/admin/ai/manual/email — update config (body: { enabled, recipient, audience, hour })
 * POST /api/admin/ai/manual/email?send=1 — envoie immédiatement le manuel à l'adresse configurée
 *
 * Avec X-Cron-Secret + ?send=1, c'est appelé par le cron quotidien.
 */
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const cfg = await getSettings(Object.values(KEYS));
  return NextResponse.json({
    enabled: cfg[KEYS.enabled] === '1',
    recipient: cfg[KEYS.recipient] || '',
    audience: cfg[KEYS.audience] || 'admin',
    hour: parseInt(cfg[KEYS.hour] || '7'),
    lastSentAt: cfg[KEYS.lastSentAt] || null
  });
}

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;
  if (!isCron) {
    const s = await getServerSession(authOptions);
    if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const sendNow = url.searchParams.get('send') === '1';

  // Update config
  const body = await req.json().catch(() => ({}));
  if (typeof body.enabled === 'boolean') await setSetting(KEYS.enabled, body.enabled ? '1' : '0');
  if (typeof body.recipient === 'string') await setSetting(KEYS.recipient, body.recipient.trim());
  if (typeof body.audience === 'string' && ['user', 'admin', 'superadmin'].includes(body.audience)) {
    await setSetting(KEYS.audience, body.audience);
  }
  if (body.hour !== undefined) {
    const h = parseInt(body.hour);
    if (!isNaN(h) && h >= 0 && h <= 23) await setSetting(KEYS.hour, String(h));
  }

  // Si POST sans ?send=1 → juste config update
  if (!sendNow) {
    return NextResponse.json({ ok: true, configUpdated: true });
  }

  // Envoi immédiat
  const cfg = await getSettings(Object.values(KEYS));
  const enabled = cfg[KEYS.enabled] === '1';
  const recipient = cfg[KEYS.recipient];
  const audience = cfg[KEYS.audience] || 'admin';

  // Si déclenché par le cron mais désactivé → skip silencieusement
  if (isCron && !enabled) {
    return NextResponse.json({ ok: true, skipped: 'feature-disabled' });
  }
  if (!recipient || !recipient.includes('@')) {
    return NextResponse.json({ error: 'recipient-missing-or-invalid' }, { status: 400 });
  }

  const manual = await prisma.manual.findFirst({
    where: { audience },
    orderBy: { createdAt: 'desc' }
  });
  if (!manual) {
    return NextResponse.json({ error: 'no-manual-yet', hint: 'Génère le manuel d\'abord depuis /admin/manuals' }, { status: 404 });
  }

  const labels: any = { user: 'Utilisateur', admin: 'Administrateur', superadmin: 'Super-Admin' };
  const dateLong = new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' });

  try {
    await sendMail({
      to: recipient,
      subject: `📚 Manuel ${labels[audience]} GLD — ${dateLong}`,
      html: manual.htmlContent,
      text: manual.markdownContent || manual.htmlContent.replace(/<[^>]+>/g, '')
    });
    await setSetting(KEYS.lastSentAt, new Date().toISOString());
    return NextResponse.json({
      ok: true,
      sent: true,
      to: recipient,
      audience,
      version: manual.version
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'mail-send-failed' }, { status: 500 });
  }
}
