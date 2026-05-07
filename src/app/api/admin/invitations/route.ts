import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET    /api/admin/invitations           — liste les invitations
 * POST   /api/admin/invitations           — crée une invitation { email, role?, ttlHours? }
 * DELETE /api/admin/invitations?id=...    — révoque
 */

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return null;
  return s;
}

export async function GET() {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const invitations = await (prisma as any).adminInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return NextResponse.json({ invitations });
  } catch {
    return NextResponse.json({ invitations: [], error: 'db-not-migrated' });
  }
}

export async function POST(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  if (!email.includes('@')) return NextResponse.json({ error: 'email-invalid' }, { status: 400 });
  const role = ['ADMIN', 'EDITOR', 'MODERATOR', 'VIEWER'].includes(body.role) ? body.role : 'ADMIN';
  const ttlHours = Math.max(1, Math.min(720, parseInt(body.ttlHours) || 24)); // 1h - 30 jours
  const expiresAt = new Date(Date.now() + ttlHours * 3600_000);
  const code = crypto.randomBytes(20).toString('base64url');

  try {
    const invitation = await (prisma as any).adminInvitation.create({
      data: {
        code, email, role, expiresAt,
        createdById: (s.user as any)?.id || null
      }
    });

    // Envoie l'email d'invitation
    const inviteUrl = `https://gld.pixeeplay.com/admin/login?invitation=${code}`;
    const html = `
      <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:24px;background:#fff;color:#222">
        <h1 style="color:#d61b80">🔑 Invitation GLD Admin</h1>
        <p>Bonjour,</p>
        <p>Tu as été invité·e à rejoindre le back-office <strong>parislgbt</strong> avec le rôle <strong>${role}</strong>.</p>
        <p style="background:#fef0e6;border-left:4px solid #d61b80;padding:12px;border-radius:4px">
          ⏰ Cette invitation expire dans <strong>${ttlHours}h</strong> (le ${expiresAt.toLocaleString('fr-FR')}).<br/>
          🔒 Usage unique — détruite après la première utilisation.
        </p>
        <p style="text-align:center;margin:32px 0">
          <a href="${inviteUrl}" style="display:inline-block;background:#d61b80;color:white;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:bold">
            Accepter l'invitation →
          </a>
        </p>
        <p style="font-size:12px;color:#666">
          Ou colle ce lien dans ton navigateur :<br/>
          <code style="background:#f0f0f0;padding:4px 8px;border-radius:4px;font-size:11px;word-break:break-all">${inviteUrl}</code>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="font-size:11px;color:#888">
          🌈 parislgbt / francelgbt — Plateforme communautaire LGBTQIA+ Paris + France.<br/>
          Si tu n'es pas l'expéditeur ou que tu ne reconnais pas cette invitation, ignore-la simplement.
        </p>
      </div>
    `;

    await sendEmail(email, `🔑 Invitation GLD Admin (${role}) — expire dans ${ttlHours}h`, html, { type: 'admin-notify' }).catch(() => {});

    return NextResponse.json({
      ok: true,
      invitation: {
        id: invitation.id,
        code: invitation.code,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        inviteUrl
      },
      message: `✓ Invitation envoyée à ${email}`
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'create-failed', message: e?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id-missing' }, { status: 400 });
  try {
    await (prisma as any).adminInvitation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'delete-failed' }, { status: 500 });
  }
}
