import { NextRequest, NextResponse } from 'next/server';
import { getVideoStatus } from '@/lib/heygen';

/**
 * Polling status d'une vidéo HeyGen.
 * GET ?id=video_id → { status, video_url?, thumbnail_url? }
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 });
  try {
    const r = await getVideoStatus(id);
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ status: 'failed', error: e?.message }, { status: 500 });
  }
}
