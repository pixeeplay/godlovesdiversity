import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadBuffer, publicUrl } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Upload générique d'image (vignettes vidéos, logos partenaires, etc.) */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image trop lourde (max 8 MB)' }, { status: 413 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Image uniquement' }, { status: 415 });

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const folder = (fd.get('folder') as string) || 'misc';
    const safeName = (fd.get('name') as string || 'img').replace(/[^a-z0-9-]/gi, '-').slice(0, 40);
    const key = `${folder}/${safeName}-${Date.now()}.${ext}`;
    await uploadBuffer(key, buf, file.type);
    return NextResponse.json({ url: publicUrl(key), key });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
