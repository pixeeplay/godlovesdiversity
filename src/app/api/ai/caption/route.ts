import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiCaptionImage } from '@/lib/ai';

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { imageUrl, words } = await req.json();
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 });
  const out = await aiCaptionImage(imageUrl, words || 80);
  return NextResponse.json(out);
}
