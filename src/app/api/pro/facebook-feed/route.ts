import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncFacebookFeed } from '@/lib/facebook-feed-scraper';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET   /api/pro/facebook-feed — état config (configuré ? dernière sync ?)
 * PATCH /api/pro/facebook-feed — sauvegarde cookies session FB
 *   Body: { cookies: { c_user, xs, datr?, fr?, sb? } }
 * POST  /api/pro/facebook-feed — déclenche la synchro
 * DELETE /api/pro/facebook-feed — efface les cookies stockés
 */

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const u = await prisma.user.findUnique({
    where: { id: (s.user as any).id },
    select: { fbSessionCookies: true, fbLastSyncedAt: true }
  });
  return NextResponse.json({
    configured: !!u?.fbSessionCookies,
    lastSyncedAt: u?.fbLastSyncedAt
  });
}

export async function PATCH(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  try {
    const { cookies } = await req.json();
    if (!cookies || typeof cookies !== 'object') return NextResponse.json({ error: 'cookies requis' }, { status: 400 });
    if (!cookies.c_user || !cookies.xs) return NextResponse.json({ error: 'c_user + xs sont obligatoires' }, { status: 400 });

    await prisma.user.update({
      where: { id: (s.user as any).id },
      data: { fbSessionCookies: JSON.stringify(cookies) }
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function POST() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const result = await syncFacebookFeed((s.user as any).id);
  return NextResponse.json(result);
}

export async function DELETE() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  await prisma.user.update({
    where: { id: (s.user as any).id },
    data: { fbSessionCookies: null, fbLastSyncedAt: null }
  });
  return NextResponse.json({ ok: true });
}
