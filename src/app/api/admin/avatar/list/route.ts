import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listAvatars, listVoices, getRemainingQuota } from '@/lib/heygen';

/**
 * Liste les avatars + voix HeyGen disponibles + quota restant.
 * GET → { avatars, voices, quota }
 */
export async function GET(_req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const [avatars, voices, quota] = await Promise.all([
      listAvatars().catch((e) => { throw new Error('Avatars: ' + e.message); }),
      listVoices('french').catch(() => []),
      getRemainingQuota().catch(() => ({ remainingCredits: null, raw: null }))
    ]);
    return NextResponse.json({ avatars, voices, quota });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur HeyGen' }, { status: 500 });
  }
}
