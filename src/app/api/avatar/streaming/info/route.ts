import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Indique quels modes du widget « Assistant queer » sont disponibles.
 *  - videoEnabled : mode Vidéo HeyGen générée (~30s par clip)
 *  - localLiveEnabled : mode Live local (avatar SVG + ElevenLabs, gratuit)
 *  - streamingEnabled : reservé pour future migration LiveAvatar
 *
 * IMPORTANT: force-dynamic obligatoire — sinon Next.js rend la réponse au build
 * et les changements dans /admin/ai/avatar ne sont pas visibles côté visiteur.
 */
export async function GET() {
  try {
    const cfg = await getSettings([
      'avatar.enabled',
      'avatar.local.enabled',
      'avatar.streaming.enabled',
      'avatar.liveavatar.enabled',
      'avatar.liveavatar.avatarId',
      'integrations.elevenlabs.apiKey',
      'integrations.liveavatar.apiKey'
    ]);
    const hasElevenLabs = !!(cfg['integrations.elevenlabs.apiKey'] || process.env.ELEVENLABS_API_KEY);
    const hasLiveAvatar = !!(cfg['integrations.liveavatar.apiKey'] || process.env.LIVEAVATAR_API_KEY);
    return NextResponse.json({
      videoEnabled: cfg['avatar.enabled'] === '1',
      localLiveEnabled: cfg['avatar.local.enabled'] === '1' && hasElevenLabs,
      streamingEnabled: cfg['avatar.streaming.enabled'] === '1',
      liveAvatarEnabled: cfg['avatar.liveavatar.enabled'] === '1' && hasLiveAvatar && !!cfg['avatar.liveavatar.avatarId'],
      hasElevenLabs,
      hasLiveAvatar
    });
  } catch {
    return NextResponse.json({
      videoEnabled: false,
      localLiveEnabled: false,
      streamingEnabled: false,
      liveAvatarEnabled: false,
      hasElevenLabs: false,
      hasLiveAvatar: false
    });
  }
}
