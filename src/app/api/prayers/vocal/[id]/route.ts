import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { minioClient, BUCKET } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireOwner(id: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return { err: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };

  const prayer = await prisma.vocalPrayer.findUnique({
    where: { id },
    select: {
      id: true, userId: true, storageKey: true, audioMime: true, durationSec: true,
      language: true, transcription: true, title: true, mood: true,
      status: true, errorMessage: true, isPublic: true,
      transcribedAt: true, createdAt: true
    }
  });
  if (!prayer) return { err: NextResponse.json({ error: 'not-found' }, { status: 404 }) };
  if (prayer.userId !== userId) return { err: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };

  return { prayer, userId };
}

/** GET /api/prayers/vocal/:id — détail (avec polling pour status) */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await requireOwner(id);
  if ('err' in r) return r.err;
  return NextResponse.json({
    ok: true,
    prayer: { ...r.prayer, audioUrl: `/api/prayers/vocal/${r.prayer!.id}/audio` }
  });
}

/** PATCH — modifier title / mood / isPublic */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await requireOwner(id);
  if ('err' in r) return r.err;

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.title === 'string') data.title = body.title.slice(0, 200);
  if (typeof body.mood === 'string') data.mood = body.mood.slice(0, 32);
  if (typeof body.isPublic === 'boolean') data.isPublic = body.isPublic;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'no-fields' }, { status: 400 });
  }

  const updated = await prisma.vocalPrayer.update({ where: { id }, data });
  return NextResponse.json({ ok: true, prayer: updated });
}

/** DELETE — RGPD : suppression totale (audio MinIO + ligne DB). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await requireOwner(id);
  if ('err' in r) return r.err;

  // Supprime le fichier sur MinIO (best-effort — la ligne DB part même si ça échoue)
  try {
    await minioClient.removeObject(BUCKET, r.prayer!.storageKey);
  } catch (e) {
    console.warn('[vocal-prayer] minio delete failed (continuing)', e);
  }

  await prisma.vocalPrayer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
