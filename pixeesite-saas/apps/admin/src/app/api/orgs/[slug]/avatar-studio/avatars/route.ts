import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { listAvatars, listVoices, getRemainingQuota } from '@/lib/heygen';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** GET → liste avatars HeyGen + voix + quota restant. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const orgId = auth.membership.org.id;
  const key = await getOrgSecret(orgId, 'HEYGEN_API_KEY');
  if (!key) return NextResponse.json({ error: 'HEYGEN_API_KEY non configurée pour cette org', avatars: [], voices: [], quota: { remainingCredits: null } }, { status: 200 });
  try {
    const [avatars, voices, quota] = await Promise.all([
      listAvatars(key).catch((e) => { throw new Error('Avatars: ' + e.message); }),
      listVoices(key, 'french').catch(() => []),
      getRemainingQuota(key).catch(() => ({ remainingCredits: null, raw: null })),
    ]);
    return NextResponse.json({ avatars, voices, quota });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'HeyGen error' }, { status: 500 });
  }
}
