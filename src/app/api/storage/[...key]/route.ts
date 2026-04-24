import { NextResponse } from 'next/server';
import { minioClient, BUCKET } from '@/lib/storage';

/**
 * Proxy de téléchargement depuis MinIO.
 * Stream les bytes côté serveur (URL interne accessible) → renvoie au navigateur.
 * En prod (Coolify), MinIO n'est pas exposé publiquement donc on doit proxy.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const fullKey = key.join('/');

  try {
    const stream = await minioClient.getObject(BUCKET, fullKey);
    const stat = await minioClient.statObject(BUCKET, fullKey);

    // Convertit le Readable Node en Web ReadableStream
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
        'Content-Type': stat.metaData?.['content-type'] || 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': stat.etag
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'not found' }, { status: 404 });
  }
}
