import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { minioClient, BUCKET } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stream audio sécurisé : seul l'owner (ou les admins via flag isPublic, plus tard)
 * peut écouter. Pas de cache navigateur — données sensibles.
 *
 * On ne fait PAS d'URL pré-signée publique : on streamait via le serveur Next, donc
 * un visiteur non-authentifié reçoit 401 même s'il a l'URL.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const prayer = await prisma.vocalPrayer.findUnique({
    where: { id },
    select: { userId: true, storageKey: true, audioMime: true, isPublic: true }
  });
  if (!prayer) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  if (prayer.userId !== userId && !prayer.isPublic) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const stream = await minioClient.getObject(BUCKET, prayer.storageKey);
    const stat = await minioClient.statObject(BUCKET, prayer.storageKey);

    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      }
    });

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        'Content-Type': prayer.audioMime || stat.metaData?.['content-type'] || 'audio/webm',
        'Content-Length': String(stat.size),
        // Données sensibles → pas de cache disque
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'storage-error', detail: e?.message }, { status: 500 });
  }
}
