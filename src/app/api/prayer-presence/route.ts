import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Présence live dans les cercles de prière.
 *
 * POST /api/prayer-presence  Body: { sessionToken?, circle, faith?, city?, country? }
 *   → upsert présence, retourne sessionToken (à stocker côté client) + counts par cercle.
 *   À appeler toutes les 30s côté client (heartbeat).
 *
 * GET /api/prayer-presence
 *   → counts globaux par cercle.
 *
 * DELETE /api/prayer-presence?sessionToken=…
 *   → leave (clean exit).
 */

function newToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

async function liveCounts(): Promise<Record<string, number>> {
  const cutoff = new Date(Date.now() - 90_000); // 90s sans heartbeat = absent
  try {
    const rows: any[] = await (prisma as any).prayerPresence.groupBy({
      by: ['circle'],
      _count: { _all: true },
      where: { lastSeenAt: { gte: cutoff } }
    });
    const out: Record<string, number> = {};
    for (const r of rows) out[r.circle] = r._count._all;
    return out;
  } catch {
    return {};
  }
}

export async function GET() {
  const counts = await liveCounts();
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return NextResponse.json({ counts, total });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const circle = String(body.circle || '').toLowerCase();
  if (!['catholic', 'protestant', 'orthodox', 'muslim', 'jewish', 'buddhist', 'hindu', 'sikh', 'interfaith'].includes(circle)) {
    return NextResponse.json({ error: 'invalid-circle' }, { status: 400 });
  }
  const sessionToken: string = typeof body.sessionToken === 'string' && body.sessionToken.length > 8 ? body.sessionToken : newToken();
  const faith = typeof body.faith === 'string' ? body.faith.slice(0, 30) : null;
  const city = typeof body.city === 'string' ? body.city.slice(0, 80) : null;
  const country = typeof body.country === 'string' ? body.country.slice(0, 8) : null;

  try {
    await (prisma as any).prayerPresence.upsert({
      where: { sessionToken },
      update: { circle, faith, city, country, lastSeenAt: new Date() },
      create: { sessionToken, circle, faith, city, country, lastSeenAt: new Date(), joinedAt: new Date() }
    });
  } catch { /* db not migrated */ }

  const counts = await liveCounts();
  return NextResponse.json({
    ok: true,
    sessionToken,
    counts,
    total: Object.values(counts).reduce((s, n) => s + n, 0)
  });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('sessionToken');
  if (!token) return NextResponse.json({ error: 'token-missing' }, { status: 400 });
  try {
    await (prisma as any).prayerPresence.delete({ where: { sessionToken: token } });
  } catch {}
  return NextResponse.json({ ok: true });
}
