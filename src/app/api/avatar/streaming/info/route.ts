import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';

/**
 * Endpoint public — indique si le streaming est activé.
 * Utilisé par le widget pour décider d'afficher le mode Live.
 */
export async function GET() {
  try {
    const cfg = await getSettings(['avatar.streaming.enabled', 'avatar.enabled']);
    return NextResponse.json({
      streamingEnabled: cfg['avatar.streaming.enabled'] === '1',
      videoEnabled: cfg['avatar.enabled'] === '1'
    });
  } catch {
    return NextResponse.json({ streamingEnabled: false, videoEnabled: false });
  }
}
