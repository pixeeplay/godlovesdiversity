import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { importPageFromLive, type EffectIntensity, type ImportMode } from '@/lib/page-import-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/page-builder/[slug]/import
 * Body: {
 *   locale?: 'fr',
 *   mode?: 'replace' | 'append',
 *   effectIntensity?: 'none' | 'subtle' | 'medium' | 'wow',
 *   dryRun?: boolean
 * }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));

  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  const result = await importPageFromLive({
    slug,
    baseUrl,
    locale: (body.locale as string) || 'fr',
    mode: (body.mode as ImportMode) || 'replace',
    effectIntensity: (body.effectIntensity as EffectIntensity) || 'subtle',
    dryRun: body.dryRun === true
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'unknown' }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    sourceUrl: result.sourceUrl,
    blocksCount: result.blocksCount,
    blocks: result.blocks,
    mode: result.mode
  });
}
