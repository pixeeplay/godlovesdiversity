import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncFacebookEvents } from '@/lib/facebook-sync';

export const dynamic = 'force-dynamic';

async function checkOwner(venueId: string, userId: string) {
  return prisma.venue.findFirst({
    where: { id: venueId, ownerId: userId },
    select: { id: true, facebookPageId: true, facebookPageToken: true, autoPublishFbEvents: true, name: true }
  });
}

/** GET /api/pro/venues/[id]/facebook — état config Facebook pour ce venue */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const { id } = await params;
  const v = await checkOwner(id, (s.user as any).id);
  if (!v) return NextResponse.json({ error: 'non autorisé' }, { status: 403 });
  return NextResponse.json({
    facebookPageId: v.facebookPageId,
    hasToken: !!v.facebookPageToken,
    autoPublishFbEvents: v.autoPublishFbEvents
  });
}

/** PATCH /api/pro/venues/[id]/facebook — sauvegarde config (pageId, token, autoPublish) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const { id } = await params;
  const v = await checkOwner(id, (s.user as any).id);
  if (!v) return NextResponse.json({ error: 'non autorisé' }, { status: 403 });

  try {
    const { facebookPageId, facebookPageToken, autoPublishFbEvents } = await req.json();
    const data: any = {};
    if (facebookPageId !== undefined) data.facebookPageId = facebookPageId || null;
    if (facebookPageToken !== undefined && facebookPageToken !== '__keep__') data.facebookPageToken = facebookPageToken || null;
    if (typeof autoPublishFbEvents === 'boolean') data.autoPublishFbEvents = autoPublishFbEvents;

    await prisma.venue.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

/** POST /api/pro/venues/[id]/facebook — déclenche la synchro */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const { id } = await params;
  const v = await checkOwner(id, (s.user as any).id);
  if (!v) return NextResponse.json({ error: 'non autorisé' }, { status: 403 });
  if (!v.facebookPageId || !v.facebookPageToken) {
    return NextResponse.json({ error: 'Connecte d\'abord ta Page Facebook (ID + token)' }, { status: 400 });
  }

  const result = await syncFacebookEvents({
    venueId: id,
    pageId: v.facebookPageId,
    pageToken: v.facebookPageToken,
    autoPublish: v.autoPublishFbEvents
  });
  return NextResponse.json(result);
}
