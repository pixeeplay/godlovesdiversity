import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/integrations/[provider]/test
 * Teste la connexion à un provider en faisant un ping API.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string; provider: string }> }) {
  const { slug, provider } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const orgId = auth.membership.org.id;
  const db = await getTenantPrisma(slug);

  let ok = false;
  let detail = '';

  try {
    switch (provider) {
      case 'slack': {
        const url = await getOrgSecret(orgId, 'SLACK_WEBHOOK');
        if (!url) { detail = 'SLACK_WEBHOOK manquant'; break; }
        const r = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Pixeesite test connection ✅' }),
        });
        ok = r.ok; if (!r.ok) detail = `HTTP ${r.status}`;
        break;
      }
      case 'discord': {
        const url = await getOrgSecret(orgId, 'DISCORD_WEBHOOK');
        if (!url) { detail = 'DISCORD_WEBHOOK manquant'; break; }
        const r = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Pixeesite test connection ✅' }),
        });
        ok = r.ok; if (!r.ok) detail = `HTTP ${r.status}`;
        break;
      }
      case 'zapier': {
        const url = await getOrgSecret(orgId, 'ZAPIER_KEY');
        if (!url) { detail = 'ZAPIER_KEY manquant'; break; }
        const r = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'test', source: 'pixeesite' }),
        });
        ok = r.ok; if (!r.ok) detail = `HTTP ${r.status}`;
        break;
      }
      case 'make': {
        const url = await getOrgSecret(orgId, 'MAKE_KEY');
        if (!url) { detail = 'MAKE_KEY manquant'; break; }
        const r = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'test', source: 'pixeesite' }),
        });
        ok = r.ok; if (!r.ok) detail = `HTTP ${r.status}`;
        break;
      }
      case 'hubspot': {
        const key = await getOrgSecret(orgId, 'HUBSPOT_KEY');
        if (!key) { detail = 'HUBSPOT_KEY manquant'; break; }
        const r = await fetch('https://api.hubapi.com/account-info/v3/details', {
          headers: { Authorization: `Bearer ${key}` },
        });
        ok = r.ok; if (!r.ok) detail = `HTTP ${r.status}`;
        break;
      }
      case 'mailchimp': {
        const key = await getOrgSecret(orgId, 'MAILCHIMP_KEY');
        if (!key) { detail = 'MAILCHIMP_KEY manquant'; break; }
        const dc = key.split('-')[1] || 'us1';
        const r = await fetch(`https://${dc}.api.mailchimp.com/3.0/ping`, {
          headers: { Authorization: `Basic ${Buffer.from(`anystring:${key}`).toString('base64')}` },
        });
        ok = r.ok; if (!r.ok) detail = `HTTP ${r.status}`;
        break;
      }
      case 'pipedrive': {
        const key = await getOrgSecret(orgId, 'PIPEDRIVE_KEY');
        if (!key) { detail = 'PIPEDRIVE_KEY manquant'; break; }
        const r = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${key}`);
        ok = r.ok; if (!r.ok) detail = `HTTP ${r.status}`;
        break;
      }
      case 'notion': {
        const key = await getOrgSecret(orgId, 'NOTION_KEY');
        if (!key) { detail = 'NOTION_KEY manquant'; break; }
        const r = await fetch('https://api.notion.com/v1/users/me', {
          headers: { Authorization: `Bearer ${key}`, 'Notion-Version': '2022-06-28' },
        });
        ok = r.ok; if (!r.ok) detail = `HTTP ${r.status}`;
        break;
      }
      case 'airtable': {
        const key = await getOrgSecret(orgId, 'AIRTABLE_KEY');
        if (!key) { detail = 'AIRTABLE_KEY manquant'; break; }
        const r = await fetch('https://api.airtable.com/v0/meta/bases', {
          headers: { Authorization: `Bearer ${key}` },
        });
        ok = r.ok; if (!r.ok) detail = `HTTP ${r.status}`;
        break;
      }
      case 'telegram': {
        const key = await getOrgSecret(orgId, 'TELEGRAM_BOT_TOKEN');
        if (!key) { detail = 'TELEGRAM_BOT_TOKEN manquant'; break; }
        const r = await fetch(`https://api.telegram.org/bot${key}/getMe`);
        ok = r.ok; if (!r.ok) detail = `HTTP ${r.status}`;
        break;
      }
      default:
        detail = `provider inconnu: ${provider}`;
    }

    // Mise à jour du statut
    await (db as any).integrationConfig.upsert({
      where: { provider },
      create: { provider, displayName: provider, active: ok, lastSyncAt: new Date(), lastSyncStatus: ok ? 'ok' : (detail || 'failed'), config: {} },
      update: { lastSyncAt: new Date(), lastSyncStatus: ok ? 'ok' : (detail || 'failed') },
    }).catch(() => {});

    return NextResponse.json({ ok, detail });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
