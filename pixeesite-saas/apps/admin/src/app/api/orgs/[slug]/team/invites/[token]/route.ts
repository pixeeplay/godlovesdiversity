import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { platformDb } from '@pixeesite/database';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/team/invites/[token]
 * Accept invitation : crée le OrgMember et marque l'invite acceptée.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; token: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const userEmail = session.user.email;

  const { token } = await params;
  const invite = await platformDb.orgInvite.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ error: 'invalid-token' }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: 'already-accepted' }, { status: 400 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'expired' }, { status: 400 });
  if (invite.email !== userEmail) return NextResponse.json({ error: 'email-mismatch' }, { status: 403 });

  const existing = await platformDb.orgMember.findFirst({ where: { orgId: invite.orgId, userId } });
  if (existing) {
    await platformDb.orgInvite.update({ where: { token }, data: { acceptedAt: new Date(), recipientId: userId } });
    return NextResponse.json({ ok: true, alreadyMember: true });
  }

  await platformDb.orgMember.create({
    data: { orgId: invite.orgId, userId, role: invite.role, acceptedAt: new Date() },
  });
  await platformDb.orgInvite.update({ where: { token }, data: { acceptedAt: new Date(), recipientId: userId } });

  return NextResponse.json({ ok: true });
}
