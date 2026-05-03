import { NextRequest, NextResponse } from 'next/server';
import { bootstrapSession } from '@/lib/liveavatar';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * Démarre une session LiveAvatar et renvoie au browser tout ce qu'il faut
 * pour rejoindre la room LiveKit.
 *
 * Body: { avatar_id?: string }  (sinon avatar.liveavatar.avatarId du settings)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cfg = await getSettings([
      'avatar.liveavatar.enabled',
      'avatar.liveavatar.avatarId',
      'avatar.liveavatar.maxDurationSec'
    ]);

    if (cfg['avatar.liveavatar.enabled'] !== '1') {
      return NextResponse.json({ error: 'LiveAvatar désactivé. Active-le dans /admin/ai/avatar.' }, { status: 403 });
    }

    const avatarId = body.avatar_id || cfg['avatar.liveavatar.avatarId'];
    if (!avatarId) {
      return NextResponse.json({ error: 'Aucun avatar LiveAvatar choisi. Va dans /admin/ai/avatar et choisis-en un.' }, { status: 400 });
    }

    const maxDur = parseInt(cfg['avatar.liveavatar.maxDurationSec'] || '120', 10);

    const session = await bootstrapSession({
      avatar_id: avatarId,
      max_session_duration: maxDur
    });

    return NextResponse.json({
      session_id: session.session_id,
      session_token: session.session_token,
      livekit_url: session.livekit_url,
      livekit_client_token: session.livekit_client_token,
      max_session_duration: session.max_session_duration
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur démarrage session LiveAvatar' }, { status: 500 });
  }
}
