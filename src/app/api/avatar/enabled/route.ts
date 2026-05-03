import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint public — indique si l'avatar GLD Live est activé.
 * Utilisé par le widget pour décider d'apparaître ou non.
 * IMPORTANT: force-dynamic obligatoire — sinon Next.js rend la réponse au build
 * et les changements dans /admin/ai/avatar ne sont pas visibles côté visiteur.
 */
export async function GET() {
  try {
    const cfg = await getSettings(['avatar.enabled']);
    return NextResponse.json({ enabled: cfg['avatar.enabled'] === '1' });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
