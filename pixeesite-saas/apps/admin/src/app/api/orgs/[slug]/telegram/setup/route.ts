import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { platformDb } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { encryptSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/telegram/setup
 * Body: { action: 'install' | 'uninstall' | 'rotate-secret', publicUrl? }
 * Configure le webhook auprès de Telegram.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const orgId = auth.membership.org.id;
  const body = await req.json().catch(() => ({} as any));
  const action = body.action as 'install' | 'uninstall' | 'rotate-secret';

  const token = await getOrgSecret(orgId, 'TELEGRAM_BOT_TOKEN');
  if (!token) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN non configuré' }, { status: 400 });

  const publicUrl =
    body.publicUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    `https://${req.headers.get('host') || 'admin.pixeesite.com'}`;
  const url = `${publicUrl.replace(/\/$/, '')}/api/orgs/${slug}/telegram/webhook`;

  try {
    if (action === 'uninstall') {
      const r = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) return NextResponse.json({ error: j.description || 'erreur Telegram' }, { status: 500 });
      return NextResponse.json({ ok: true, action: 'uninstalled' });
    }

    // install / rotate-secret : génère un secret si absent
    let secret = await getOrgSecret(orgId, 'TELEGRAM_WEBHOOK_SECRET');
    if (!secret || action === 'rotate-secret') {
      secret = crypto.randomBytes(32).toString('hex');
      await platformDb.orgSecret.upsert({
        where: { orgId_key: { orgId, key: 'TELEGRAM_WEBHOOK_SECRET' } },
        create: { orgId, key: 'TELEGRAM_WEBHOOK_SECRET', value: encryptSecret(secret), category: 'integrations', active: true },
        update: { value: encryptSecret(secret), active: true },
      });
    }

    const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        secret_token: secret,
        allowed_updates: ['message', 'edited_message', 'callback_query'],
      }),
    });
    const j = await r.json();
    if (!r.ok) return NextResponse.json({ error: j.description || 'erreur Telegram' }, { status: 500 });

    return NextResponse.json({ ok: true, action: 'installed', webhook: { url, ...j.result } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erreur setup' }, { status: 500 });
  }
}
