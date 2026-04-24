import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBuffer, publicUrl } from '@/lib/storage';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const posters = await prisma.poster.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  return NextResponse.json({
    posters: posters.map((p) => ({
      ...p,
      fileUrl: publicUrl(p.fileKey),
      thumbnailUrl: p.thumbnailKey ? publicUrl(p.thumbnailKey) : null
    }))
  });
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const fd = await req.formData();
  const file = fd.get('file') as File | null;
  const thumbnail = fd.get('thumbnail') as File | null;
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
  const fileKey = `posters/${crypto.randomUUID()}.${ext}`;
  await uploadBuffer(fileKey, buf, file.type || 'application/pdf');

  let thumbnailKey: string | undefined;
  if (thumbnail && thumbnail.size > 0) {
    const tbuf = Buffer.from(await thumbnail.arrayBuffer());
    const text = (thumbnail.name.split('.').pop() || 'png').toLowerCase();
    thumbnailKey = `posters/thumb-${crypto.randomUUID()}.${text}`;
    await uploadBuffer(thumbnailKey, tbuf, thumbnail.type || 'image/png');
  }

  const poster = await prisma.poster.create({
    data: {
      title: String(fd.get('title') || file.name),
      description: String(fd.get('description') || '') || null,
      format: String(fd.get('format') || 'A3'),
      size: String(fd.get('size') || '') || null,
      order: Number(fd.get('order') || 0),
      published: fd.get('published') !== '0',
      fileKey,
      thumbnailKey
    }
  });
  return NextResponse.json({ ok: true, poster });
}
