/**
 * /api/orgs/[slug]/email-templates/test-send — envoie un email de test via Resend.
 * Utilise la clé RESEND_API_KEY récupérée via getOrgSecret (fallback platform).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const orgId = auth.membership.org.id;
  const body = await req.json().catch(() => ({}));
  const to = (body.to as string)?.trim();
  const subject = (body.subject as string)?.trim() || '(test)';
  const text = (body.body as string) || '';

  if (!to) return NextResponse.json({ error: 'to-required' }, { status: 400 });

  const apiKey = await getOrgSecret(orgId, 'RESEND_API_KEY');
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY non configurée pour cette org ni au niveau plateforme.' }, { status: 412 });

  const from = (await getOrgSecret(orgId, 'RESEND_FROM_EMAIL')) || 'onboarding@resend.dev';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: text.replace(/\n/g, '<br/>')
      }),
      signal: AbortSignal.timeout(20_000)
    });
    if (!r.ok) {
      const err = await r.text().catch(() => '');
      return NextResponse.json({ error: `Resend HTTP ${r.status}: ${err.slice(0, 200)}` }, { status: 502 });
    }
    const j = await r.json();
    return NextResponse.json({ ok: true, id: j.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'send-error' }, { status: 500 });
  }
}
