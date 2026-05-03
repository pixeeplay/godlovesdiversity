import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncContextWithRag, listContexts } from '@/lib/liveavatar';

export const dynamic = 'force-dynamic';

/**
 * POST  → resynchronise le context LiveAvatar (system prompt + tous les docs RAG)
 * GET   → liste les contexts existants côté LiveAvatar
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Auth requise' }, { status: 401 });

  const result = await syncContextWithRag();
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 500 });
  }
  return NextResponse.json(result);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Auth requise' }, { status: 401 });

  try {
    const list = await listContexts();
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
