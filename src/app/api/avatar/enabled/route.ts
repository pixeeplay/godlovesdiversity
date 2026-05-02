import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';

/**
 * Endpoint public — indique si l'avatar GLD Live est activé.
 * Utilisé par le widget pour décider d'apparaître ou non.
 */
export async function GET() {
  try {
    const cfg = await getSettings(['avatar.enabled']);
    return NextResponse.json({ enabled: cfg['avatar.enabled'] === '1' });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
