import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { platformDb } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * POST /api/orgs/[slug]/team/invites
 * Body: { email, role: 'admin'|'editor'|'viewer' }
 * Crée une OrgInvite + envoie un email Resend avec un lien magique.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const email = (body.email as string)?.trim().toLowerCase();
  const role = (body.role as string) || 'editor';
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'invalid-email' }, { status: 400 });
  if (!['admin', 'editor', 'viewer'].includes(role)) return NextResponse.json({ error: 'invalid-role' }, { status: 400 });

  // Check si user existe déjà
  const existingUser = await platformDb.user.findUnique({ where: { email } });
  if (existingUser) {
    const alreadyMember = await platformDb.orgMember.findFirst({
      where: { orgId: auth.membership.org.id, userId: existingUser.id },
    });
    if (alreadyMember) return NextResponse.json({ error: 'already-member' }, { status: 409 });
  }

  const token = randomBytes(32).toString('hex');
  const invite = await platformDb.orgInvite.create({
    data: {
      orgId: auth.membership.org.id,
      email,
      role,
      token,
      invitedById: auth.userId,
      recipientId: existingUser?.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    },
  });

  // Envoie l'email
  const baseUrl = process.env.ADMIN_URL || 'https://app.pixeesite.com';
  const acceptUrl = `${baseUrl}/invites/${token}`;
  if (resend) {
    await resend.emails.send({
      from: 'Pixeesite <noreply@pixeesite.com>',
      to: email,
      subject: `Invitation à rejoindre ${orgSlug} sur Pixeesite`,
      html: `
        <div style="font-family: system-ui; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h1 style="background: linear-gradient(135deg, #d946ef, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 900;">Pixeesite</h1>
          <p>Tu as été invité·e à rejoindre <strong>${orgSlug}</strong> en tant que <strong>${role}</strong>.</p>
          <p><a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #d946ef, #06b6d4); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accepter l'invitation</a></p>
          <p style="color: #71717a; font-size: 12px;">Lien valide 7 jours. Si tu n'as pas demandé cette invitation, ignore cet email.</p>
        </div>
      `,
    }).catch((e: any) => console.error('[resend]', e));
  }

  return NextResponse.json({ ok: true, invite, acceptUrl }, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const invites = await platformDb.orgInvite.findMany({
    where: { orgId: auth.membership.org.id, acceptedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  const members = await platformDb.orgMember.findMany({
    where: { orgId: auth.membership.org.id },
    include: { user: { select: { email: true, name: true, avatarUrl: true } } },
  });
  return NextResponse.json({ invites, members });
}
