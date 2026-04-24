import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadBuffer, publicUrl } from '@/lib/storage';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const fd = await req.formData();
  const file = fd.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 4 * 1024 * 1024) return NextResponse.json({ error: 'max 4 MB' }, { status: 413 });

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const key = `branding/logo-${crypto.randomUUID()}.${ext}`;
  await uploadBuffer(key, buf, file.type || 'image/png');
  const url = publicUrl(key);

  await prisma.setting.upsert({
    where: { key: 'site.logoUrl' },
    update: { value: url },
    create: { key: 'site.logoUrl', value: url }
  });

  return NextResponse.json({ ok: true, url });
}
