import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadBuffer, publicUrl } from '@/lib/storage';

/**
 * Sauvegarde une image base64 (générée par IA) dans MinIO.
 * Body : { data: 'base64...', mimeType: 'image/png', name?: 'hero-1' }
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const data: string = body.data;
  const mimeType: string = body.mimeType || 'image/png';
  if (!data) return NextResponse.json({ error: 'data required' }, { status: 400 });

  try {
    const buf = Buffer.from(data, 'base64');
    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
    const name = (body.name || `ai-${Date.now()}`).replace(/[^a-z0-9-]/gi, '-');
    const key = `ai/${name}-${Date.now()}.${ext}`;
    await uploadBuffer(key, buf, mimeType);
    return NextResponse.json({ key, url: publicUrl(key) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
