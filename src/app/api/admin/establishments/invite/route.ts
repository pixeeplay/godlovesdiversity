import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || !['ADMIN', 'EDITOR'].includes((s.user as any).role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { email, name, city, message } = await req.json();
  if (!email || !name) return NextResponse.json({ error: 'email + nom requis' }, { status: 400 });

  const setting = await prisma.setting.findUnique({ where: { key: 'integrations.resend.apiKey' } }).catch(() => null);
  const apiKey = setting?.value || process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Resend non configuré' }, { status: 503 });

  const from = (await prisma.setting.findUnique({ where: { key: 'integrations.resend.from' } }).catch(() => null))?.value || 'GLD <hello@gld.pixeeplay.com>';
  const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://gld.pixeeplay.com'}/admin/pro/onboard?invite=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&city=${encodeURIComponent(city || '')}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px;">
      <h1 style="color: #d61b80;">✨ Invitation parislgbt</h1>
      <p style="white-space: pre-wrap;">${(message || '').replace(/</g, '&lt;')}</p>
      <p style="margin: 24px 0;">
        <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #06b6d4); color: white; padding: 12px 24px; text-decoration: none; border-radius: 999px; font-weight: bold;">
          Créer ma fiche établissement
        </a>
      </p>
      <p style="font-size: 12px; color: #666;">Ou colle ce lien : ${inviteLink}</p>
    </div>
  `;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: email,
      subject: `Invitation : rejoins l'annuaire LGBT-friendly de GLD`,
      html
    })
  });
  const j = await r.json();
  if (!r.ok) return NextResponse.json({ error: j.message || `HTTP ${r.status}` }, { status: 500 });

  return NextResponse.json({ ok: true, sent: true });
}
