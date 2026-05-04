import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncAllFacebookVenues } from '@/lib/facebook-sync';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/facebook/sync-all
 * Synchronise les events Facebook de TOUS les venues qui ont une config FB.
 * Auth :
 *   - Soit session admin (bouton manuel dans /admin/integrations)
 *   - Soit header `x-cron-token` qui matche CRON_TOKEN env (cron quotidien)
 */
export async function POST(req: Request) {
  const cronToken = req.headers.get('x-cron-token');
  const isCron = cronToken && cronToken === process.env.CRON_TOKEN;

  if (!isCron) {
    const s = await getServerSession(authOptions);
    if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const summary = await syncAllFacebookVenues();
  return NextResponse.json(summary);
}
