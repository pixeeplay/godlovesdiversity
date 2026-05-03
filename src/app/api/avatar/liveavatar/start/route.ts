import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { bootstrapSession, ensureContext } from '@/lib/liveavatar';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * Démarre une session LiveAvatar **FULL Mode** — LiveAvatar gère NATIVEMENT
 * VAD + STT + LLM + TTS. Pas besoin de wirage Gemini ou autre.
 *
 * Body: { avatar_id?, voice_id?, language?, fromAdmin? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cfg = await getSettings([
      'avatar.liveavatar.enabled',
      'avatar.liveavatar.avatarId',
      'avatar.liveavatar.voiceId',
      'avatar.liveavatar.language',
      'avatar.liveavatar.maxDurationSec'
    ]);

    let isAdmin = false;
    if (body.fromAdmin) {
      const session = await getServerSession(authOptions);
      isAdmin = !!session;
    }

    if (!isAdmin && cfg['avatar.liveavatar.enabled'] !== '1') {
      return NextResponse.json({ error: 'LiveAvatar désactivé. Active-le dans /admin/ai/avatar.' }, { status: 403 });
    }

    const avatarId = body.avatar_id || cfg['avatar.liveavatar.avatarId'];
    if (!avatarId) {
      return NextResponse.json({ error: 'Aucun avatar choisi. Va dans /admin/ai/avatar et choisis-en un.' }, { status: 400 });
    }

    const maxDur = parseInt(cfg['avatar.liveavatar.maxDurationSec'] || '120', 10);
    const voiceId = body.voice_id || cfg['avatar.liveavatar.voiceId'] || undefined;
    const language = body.language || cfg['avatar.liveavatar.language'] || 'fr';

    // Garantit qu'un context (system prompt + RAG) existe côté LiveAvatar
    const ctx = await ensureContext();
    if (!ctx.contextId) {
      return NextResponse.json({
        error: `Context LiveAvatar non créé : ${ctx.reason || 'erreur'}`,
        hint: 'Clique « Synchroniser le Cerveau de GLD vers LiveAvatar » dans l\'admin.'
      }, { status: 500 });
    }

    const session = await bootstrapSession({
      avatar_id: avatarId,
      voice_id: voiceId,
      context_id: ctx.contextId,
      language,
      max_session_duration: maxDur
    });

    return NextResponse.json({
      session_id: session.session_id,
      session_token: session.session_token,
      livekit_url: session.livekit_url,
      livekit_client_token: session.livekit_client_token,
      max_session_duration: session.max_session_duration,
      avatar_id: avatarId,
      voice_id: voiceId,
      language,
      reaped: session.reaped,
      mode: 'FULL'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur démarrage session LiveAvatar' }, { status: 500 });
  }
}
