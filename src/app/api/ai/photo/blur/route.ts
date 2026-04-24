import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBuffer, publicUrl } from '@/lib/storage';
import { blurFaces } from '@/lib/imageTools';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { photoId } = await req.json();
  if (!photoId) return NextResponse.json({ error: 'photoId required' }, { status: 400 });

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Récupère l'image
  const url = publicUrl(photo.storageKey);
  const r = await fetch(url);
  const buf = Buffer.from(await r.arrayBuffer());
  const mime = r.headers.get('content-type') || 'image/jpeg';

  const result = await blurFaces(buf, mime);

  // Remplace la photo (garde l'ancienne en backup)
  const ext = (photo.storageKey.split('.').pop() || 'jpg');
  const newKey = `uploads/blurred/${crypto.randomUUID()}.${ext}`;
  await uploadBuffer(newKey, result, mime);
  await prisma.photo.update({
    where: { id: photoId },
    data: { storageKey: newKey, aiModerationFlags: { ...(photo.aiModerationFlags as any), blurredAt: new Date().toISOString(), originalKey: photo.storageKey } }
  });

  return NextResponse.json({ ok: true, newUrl: publicUrl(newKey) });
}
