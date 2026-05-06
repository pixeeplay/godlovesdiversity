import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/admin/newsletter/test-send
 * Body: { subject, htmlContent, to: string | string[] }
 *
 * Envoie une seule fois la campagne en TEST à un (ou plusieurs) email(s)
 * sans toucher la base ni la liste des abonnés. Le sujet est préfixé "[TEST]".
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const subject = String(body.subject || '').trim();
  const html = String(body.htmlContent || '').trim();
  if (!subject || !html) return NextResponse.json({ error: 'subject + htmlContent requis' }, { status: 400 });

  const targets: string[] = (
    Array.isArray(body.to)
      ? body.to
      : typeof body.to === 'string'
        ? body.to.split(/[\s,;]+/)
        : []
  ).map((e: string) => e.trim()).filter((e: string) => e.includes('@'));

  if (targets.length === 0) {
    return NextResponse.json({ error: 'Aucun email valide. Format : "a@x.com, b@y.com"' }, { status: 400 });
  }
  if (targets.length > 10) {
    return NextResponse.json({ error: 'Maximum 10 emails en test.' }, { status: 400 });
  }

  const testHtml = `
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin-bottom:16px;font-family:system-ui,sans-serif;color:#78350f;border-radius:6px">
      ⚡ <b>EMAIL DE TEST</b> — Cette campagne n'a pas été envoyée à la liste réelle. Demandé par ${s.user?.email || 'admin'} le ${new Date().toLocaleString('fr-FR')}.
    </div>
    ${html}
  `;

  const results = await Promise.allSettled(
    targets.map((to) => sendEmail(to, `[TEST] ${subject}`, testHtml, { type: 'test' }))
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - sent;
  const errors = results
    .map((r, i) => r.status === 'rejected' ? { to: targets[i], error: (r.reason?.message || String(r.reason)) } : null)
    .filter(Boolean);

  return NextResponse.json({
    ok: failed === 0,
    sent,
    failed,
    targets,
    errors,
    message: failed === 0
      ? `✓ Test envoyé à ${sent} destinataire(s).`
      : `Test envoyé à ${sent}/${targets.length} (${failed} échec(s))`
  });
}
