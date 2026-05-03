import { NextRequest, NextResponse } from 'next/server';
import { stopStreamingSession } from '@/lib/heygen-streaming';

export const runtime = 'nodejs';

/**
 * Termine une session HeyGen Streaming. À appeler systématiquement quand
 * le visiteur ferme le widget pour libérer les crédits.
 */
export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id) return NextResponse.json({ error: 'session_id requis' }, { status: 400 });
    await stopStreamingSession(session_id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
