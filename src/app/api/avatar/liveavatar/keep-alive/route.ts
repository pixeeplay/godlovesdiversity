import { NextRequest, NextResponse } from 'next/server';
import { keepSessionAlive } from '@/lib/liveavatar';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { session_id, session_token } = await req.json();
    if (!session_id || !session_token) {
      return NextResponse.json({ error: 'session_id et session_token requis' }, { status: 400 });
    }
    await keepSessionAlive(session_token, session_id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur keep-alive' }, { status: 500 });
  }
}
