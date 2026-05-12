import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/manuals/[id]/email
 *   body: { to: string, subject?: string, from?: string }
 *
 * Envoie le manuel par email via Resend (RESEND_API_KEY de l'org, fallback platform).
 */

function mdToHtml(md: string): string {
  // Minimal markdown→HTML (faithful to GLD output: keep simple)
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>(\n|$))+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/m, '<p>$1</p>');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const orgId = auth.membership.org.id;
  const b = await req.json().catch(() => ({}));
  const to = String(b.to || '').trim();
  if (!to || !to.includes('@')) return NextResponse.json({ error: 'to (email) required' }, { status: 400 });

  const db = await getTenantPrisma(slug);
  const rows: any = await (db as any).$queryRawUnsafe(`SELECT * FROM "AiManual" WHERE "id" = $1`, id);
  const m = rows?.[0];
  if (!m) return NextResponse.json({ error: 'manual-not-found' }, { status: 404 });

  const resendKey = await getOrgSecret(orgId, 'RESEND_API_KEY');
  if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY non configurée (org ou platform)' }, { status: 400 });

  const from = b.from || (await getOrgSecret(orgId, 'RESEND_FROM')) || 'manuels@pixeesite.com';
  const subject = b.subject || `Manuel : ${m.title}`;
  const html = `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;max-width:680px;margin:auto;color:#18181b;line-height:1.6">
    <h1 style="margin:0 0 6px;font-size:24px;color:#d946ef">${m.title}</h1>
    <p style="margin:0 0 18px;font-size:12px;color:#71717a">Audience : ${m.audience} · Langue : ${m.language}</p>
    ${mdToHtml(m.content)}
  </body></html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html, text: m.content }),
    });
    const j = await r.json();
    if (!r.ok) return NextResponse.json({ ok: false, error: j.message || `HTTP ${r.status}` }, { status: 502 });
    return NextResponse.json({ ok: true, to, subject, id: j.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'send-failed' }, { status: 500 });
  }
}
