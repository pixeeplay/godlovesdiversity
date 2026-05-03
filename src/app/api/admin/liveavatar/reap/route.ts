import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reapActiveSessions, listActiveSessions } from '@/lib/liveavatar';

export const dynamic = 'force-dynamic';

/**
 * Ferme toutes les sessions actives LiveAvatar.
 * Utile sur le free tier (1 concurrency max) quand une session zombie bloque.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Auth requise' }, { status: 401 });

  try {
    const before = await listActiveSessions().catch(() => ({ count: 0, results: [] }));
    const killed = await reapActiveSessions();
    return NextResponse.json({
      ok: true,
      foundActive: before.count || before.results?.length || 0,
      killed
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 });
  }
}
