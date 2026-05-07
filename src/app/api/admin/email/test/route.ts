import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail, getEmailDiagnostic } from '@/lib/email';

/**
 * Envoie un email de test pour valider la config Resend/SMTP.
 * POST { to: string }
 *
 * GET → renvoie le diagnostic de la config (clé Resend OK ?, expéditeur, etc.)
 */
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const diag = await getEmailDiagnostic();
  return NextResponse.json(diag);
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { to } = await req.json();
  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'destinataire invalide' }, { status: 400 });
  }
  const subject = `Test GLD — ${new Date().toLocaleString('fr-FR')}`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #FF2BB1; margin: 0 0 16px;">✅ Email de test reçu</h1>
      <p>Si tu lis ce message, c'est que ta configuration Resend (ou SMTP) fonctionne correctement.</p>
      <p style="color: #888; font-size: 13px;">
        Envoyé depuis le back-office parislgbt le ${new Date().toLocaleString('fr-FR')}.
      </p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #888; font-size: 12px;">
        Tu reçois cet email parce que tu as cliqué sur "Tester l'envoi" dans
        <code>/admin/newsletter</code>. Aucune action n'est requise.
      </p>
    </div>
  `;
  try {
    const result = await sendEmail(to, subject, html, { type: 'test' });
    return NextResponse.json({
      ok: true,
      messageId: result?.id || result?.messageId,
      message: 'Email envoyé. Vérifie ta boîte de réception (et le dossier spam).'
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e?.message || 'Erreur inconnue',
      hint: 'Vérifie ta clé Resend dans Paramètres → Logistique → Email Resend, et que ton domaine d\'expédition est bien vérifié sur resend.com/domains'
    }, { status: 500 });
  }
}
