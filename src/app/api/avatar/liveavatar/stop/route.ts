import { NextRequest, NextResponse } from 'next/server';
import { stopSession } from '@/lib/liveavatar';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { session_id, session_token, reason } = await req.json();
    if (!session_id || !session_token) {
      return NextResponse.json({ error: 'session_id et session_token requis' }, { status: 400 });
    }
    await stopSession(session_token, session_id, reason || 'USER_END');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur stop session' }, { status: 500 });
  }
}
