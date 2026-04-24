import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadBuffer, publicUrl } from '@/lib/storage';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const fd = await req.formData();
  const files = fd.getAll('files') as File[];
  if (!files.length) return NextResponse.json({ error: 'no file' }, { status: 400 });

  const out: { key: string; url: string; mime: string; name: string }[] = [];
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    if (buf.length > 50 * 1024 * 1024) return NextResponse.json({ error: `${f.name} > 50MB` }, { status: 413 });
    const ext = (f.name.split('.').pop() || 'bin').toLowerCase();
    const key = `social/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    await uploadBuffer(key, buf, f.type || 'application/octet-stream');
    out.push({ key, url: publicUrl(key), mime: f.type || '', name: f.name });
  }
  return NextResponse.json({ ok: true, files: out });
}
