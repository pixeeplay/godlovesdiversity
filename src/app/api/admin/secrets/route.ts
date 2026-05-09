import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Gestion des secrets (clés API) depuis l'admin — alternative à Coolify env vars.
 *
 * Stockage : table Setting avec préfixe "secret." (ex: "secret.ANTHROPIC_API_KEY").
 * Les clés sont MASQUÉES quand renvoyées (3 derniers caractères visibles).
 *
 * Au runtime, le code appelle `getSecret('ANTHROPIC_API_KEY')` qui :
 *   1. Lit env (prioritaire — Coolify gagne toujours)
 *   2. Sinon DB Setting "secret.X"
 *   3. Sinon undefined
 *
 * ADMIN-only.
 */

const KNOWN_SECRETS = [
  { key: 'ANTHROPIC_API_KEY',         label: 'Anthropic API Key',                desc: 'Pour Claude CLI online — sk-ant-...', tip: 'Récupère sur console.anthropic.com' },
  { key: 'CLAUDE_CODE_OAUTH_TOKEN',   label: 'Claude OAuth Token (abo Max)',     desc: 'Token OAuth de ton abo Max',         tip: 'Cherche dans ~/.claude/credentials.json après `claude-code login`' },
  { key: 'GEMINI_API_KEY',            label: 'Gemini API Key',                    desc: 'Pour transcription vocale + génération news/events/newsletter', tip: 'Récupère sur aistudio.google.com/apikey' },
  { key: 'OPENROUTER_API_KEY',        label: 'OpenRouter API Key',                desc: 'Fallback IA multi-providers' },
  { key: 'RESEND_API_KEY',            label: 'Resend API Key',                    desc: 'Envoi emails (newsletter, alertes)', tip: 'resend.com/api-keys' },
  { key: 'TELEGRAM_BOT_TOKEN',        label: 'Telegram Bot Token',                desc: 'Notifications + commandes admin' },
  { key: 'TWILIO_ACCOUNT_SID',        label: 'Twilio Account SID',                desc: 'SMS 2FA' },
  { key: 'TWILIO_AUTH_TOKEN',         label: 'Twilio Auth Token',                 desc: 'SMS 2FA' },
  { key: 'TWILIO_FROM_NUMBER',        label: 'Twilio From Number',                desc: 'Numéro expéditeur SMS' },
  { key: 'PRICE_ALERT_SLACK_WEBHOOK', label: 'Slack Webhook (alertes prix)',     desc: 'URL webhook incoming' },
  { key: 'PRICE_ALERT_EMAIL',         label: 'Email destinataire alertes prix',   desc: 'Destinataire des alertes PriceWatch' },
  { key: 'CRON_SECRET',               label: 'Cron Secret',                       desc: 'Header X-Cron-Secret pour les tâches Coolify' },
  { key: 'TARIFF_MAIL_SECRET',        label: 'Tariff Mail Secret',                desc: 'Webhook Resend pour parsing email tarifs' },
  { key: 'PM_API_URL',                label: 'PIM API URL',                       desc: 'productsmanager.app endpoint' },
  { key: 'PM_API_KEY',                label: 'PIM API Key',                       desc: 'productsmanager.app token' },
  { key: 'GITHUB_TOKEN',              label: 'GitHub Token',                      desc: 'Pour Time Machine + paperasse sync' },
  { key: 'FAL_KEY',                   label: 'fal.ai Key',                        desc: 'Génération vidéo Seedance' },
  { key: 'HEYGEN_API_KEY',            label: 'HeyGen API Key',                    desc: 'Avatar V upper-body' },
  { key: 'CODE_SERVER_URL',           label: 'code-server URL (Tailscale)',      desc: 'VS Code self-hosted' }
] as const;

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if ((s.user as any)?.role !== 'ADMIN') return null;
  return s;
}

function maskValue(v: string | null | undefined): string {
  if (!v) return '';
  if (v.length <= 4) return '••••';
  return '••••••••' + v.slice(-3);
}

/** GET /api/admin/secrets — liste des secrets avec valeurs masquées + statut env vs db */
export async function GET() {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Lit toutes les Settings prefixées "secret."
  const dbRows = await prisma.setting.findMany({
    where: { key: { startsWith: 'secret.' } },
    select: { key: true, value: true }
  }).catch(() => []);
  const dbMap = new Map(dbRows.map((r) => [r.key.replace('secret.', ''), r.value]));

  const secrets = KNOWN_SECRETS.map((sec) => {
    const envVal = process.env[sec.key];
    const dbVal = dbMap.get(sec.key);
    const effective = envVal || dbVal || '';
    return {
      key: sec.key,
      label: sec.label,
      desc: sec.desc,
      tip: (sec as any).tip || null,
      configured: !!effective,
      source: envVal ? 'env' : dbVal ? 'db' : null,
      masked: maskValue(effective)
    };
  });

  return NextResponse.json({ ok: true, secrets });
}

/** PUT /api/admin/secrets body: { key, value } — store en Setting "secret.<key>" */
export async function PUT(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { key, value } = body;
  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'key-required' }, { status: 400 });
  }
  if (!KNOWN_SECRETS.find((k) => k.key === key)) {
    return NextResponse.json({ error: 'unknown-secret' }, { status: 400 });
  }
  if (typeof value !== 'string') {
    return NextResponse.json({ error: 'value-required' }, { status: 400 });
  }

  const settingKey = `secret.${key}`;
  if (!value.trim()) {
    // Empty value = delete
    await prisma.setting.delete({ where: { key: settingKey } }).catch(() => null);
    return NextResponse.json({ ok: true, deleted: true });
  }

  await prisma.setting.upsert({
    where: { key: settingKey },
    create: { key: settingKey, value: value.trim() },
    update: { value: value.trim() }
  });

  // Update process.env in memory pour que les requests suivantes voient la nouvelle valeur sans restart
  // (Note : ne marche que pour le worker courant, pas les autres pods en cluster)
  if (!process.env[key]) {
    process.env[key] = value.trim();
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/secrets?key=X */
export async function DELETE(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key-required' }, { status: 400 });

  await prisma.setting.delete({ where: { key: `secret.${key}` } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
