import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { newStreamingSession, startStreamingSession } from '@/lib/heygen-streaming';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Démarre une session HeyGen Interactive Avatar.
 * Renvoie l'URL LiveKit + token JWT pour que le browser se connecte directement.
 *
 * Plafond temps : 2 min/visiteur géré côté client (cookie) + côté HeyGen via stop().
 */
export async function POST(_req: NextRequest) {
  try {
    const cfg = await getSettings([
      'avatar.enabled',
      'avatar.streaming.enabled',
      'avatar.streaming.avatarName',
      'avatar.heygen.voiceId'
    ]);

    // Admin peut toujours tester ; sinon il faut avatar.streaming.enabled = '1'
    const session = await getServerSession(authOptions);
    const isAdmin = !!session;
    if (cfg['avatar.streaming.enabled'] !== '1' && !isAdmin) {
      return NextResponse.json({ error: 'streaming_disabled' }, { status: 403 });
    }

    const avatarName = cfg['avatar.streaming.avatarName'] || 'Susan_public_2_20240328';
    const voiceId = cfg['avatar.heygen.voiceId'] || undefined;

    const info = await newStreamingSession({
      avatarName,
      voiceId,
      quality: 'medium'
    });

    // Démarre côté HeyGen
    await startStreamingSession(info.session_id);

    return NextResponse.json({
      ok: true,
      session_id: info.session_id,
      url: info.url,
      access_token: info.access_token,
      avatarName,
      maxDurationSec: 120 // 2 min plafond
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e?.message || 'Erreur démarrage streaming'
    }, { status: 500 });
  }
}
