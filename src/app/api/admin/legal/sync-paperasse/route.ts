import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncPaperasse, getPaperasseStatus, type PaperasseSkill } from '@/lib/paperasse-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // ingestion peut prendre 5-10 min (60+ fichiers à embedder)

/** GET — état d'avancement (combien de docs paperasse ingérés par skill). */
export async function GET(_req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const r = await getPaperasseStatus();
  return NextResponse.json(r);
}

/** POST — déclenche le sync. Body : { skills?: ['comptable', ...], force?: bool } */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const r = await syncPaperasse({
      skills: Array.isArray(body.skills) ? (body.skills as PaperasseSkill[]) : undefined,
      force: !!body.force,
    });
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'sync KO' }, { status: 500 });
  }
}
