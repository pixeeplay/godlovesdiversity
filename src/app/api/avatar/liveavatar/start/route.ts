import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { bootstrapSession, ensureGeminiVoiceAgent } from '@/lib/liveavatar';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * Démarre une session LiveAvatar LITE Mode + Gemini Realtime voice agent.
 * Sans voice agent, l'avatar n'écoute pas (LITE = "broadcast only").
 *
 * Body: { avatar_id?: string, voice?: string, fromAdmin?: boolean }
 *  - avatar_id : prioritaire sur avatar.liveavatar.avatarId du settings.
 *                Permet à l'admin de tester un avatar choisi sans avoir à sauvegarder d'abord.
 *  - voice     : voix Gemini (Puck par défaut)
 *  - fromAdmin : si true, bypasse le check avatar.liveavatar.enabled (pour les tests admin)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cfg = await getSettings([
      'avatar.liveavatar.enabled',
      'avatar.liveavatar.avatarId',
      'avatar.liveavatar.maxDurationSec',
      'avatar.liveavatar.voice'
    ]);

    // Test depuis l'admin : on ignore le flag enabled et on accepte avatar_id direct
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
      return NextResponse.json({ error: 'Aucun avatar LiveAvatar choisi. Va dans /admin/ai/avatar et choisis-en un.' }, { status: 400 });
    }

    const maxDur = parseInt(cfg['avatar.liveavatar.maxDurationSec'] || '120', 10);
    const voice = body.voice || cfg['avatar.liveavatar.voice'] || 'Puck';

    // Auto-provision le voice agent Gemini (secret + context côté LiveAvatar)
    const agent = await ensureGeminiVoiceAgent();
    let geminiConfig: { secret_id: string; context_id?: string; voice?: string } | undefined;
    if (agent.secretId) {
      geminiConfig = { secret_id: agent.secretId, voice };
      if (agent.contextId) geminiConfig.context_id = agent.contextId;
    }

    if (!geminiConfig) {
      return NextResponse.json({
        error: `Voice agent Gemini non configuré : ${agent.reason || 'erreur inconnue'}. Sans agent, l'avatar bouge mais n'écoute pas.`,
        hint: 'Ajoute la clé Gemini dans Paramètres → IA & Outils → Gemini'
      }, { status: 500 });
    }

    const session = await bootstrapSession({
      avatar_id: avatarId,
      max_session_duration: maxDur,
      gemini_realtime_config: geminiConfig
    });

    return NextResponse.json({
      session_id: session.session_id,
      session_token: session.session_token,
      livekit_url: session.livekit_url,
      livekit_client_token: session.livekit_client_token,
      max_session_duration: session.max_session_duration,
      avatar_id: avatarId,
      voice,
      reaped: session.reaped,
      voiceAgent: 'gemini-realtime'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur démarrage session LiveAvatar' }, { status: 500 });
  }
}
