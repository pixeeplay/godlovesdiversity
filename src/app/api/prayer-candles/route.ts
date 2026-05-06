import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/prayer-candles?since=ISO
 * Liste les bougies actives (status=active && expiresAt > now).
 *
 * POST /api/prayer-candles
 * Body : { lat, lng, intention?, faith?, city?, country? }
 * Crée une bougie pour 24h. Rate-limit IP : max 5/heure.
 */

async function getClientHash(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0] ||
             h.get('x-real-ip') ||
             'unknown';
  const ua = h.get('user-agent') || '';
  return crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const where: any = {
      status: 'active',
      expiresAt: { gt: new Date() }
    };
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) where.createdAt = { gt: sinceDate };
    }
    const candles = await (prisma as any).prayerCandle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { id: true, lat: true, lng: true, intention: true, faith: true, city: true, country: true, expiresAt: true, createdAt: true }
    });
    return NextResponse.json({ candles, count: candles.length });
  } catch (e: any) {
    return NextResponse.json({ candles: [], count: 0, error: 'db-not-migrated' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: 'lat/lng invalides' }, { status: 400 });
    }
    const intention = (typeof body.intention === 'string' ? body.intention : '').slice(0, 280);
    const faith = (typeof body.faith === 'string' ? body.faith : null);
    const city = (typeof body.city === 'string' ? body.city : null)?.slice(0, 80) || null;
    const country = (typeof body.country === 'string' ? body.country : null)?.slice(0, 8) || null;

    const userHash = await getClientHash();

    // Rate-limit : max 5/heure par hash
    try {
      const recentCount = await (prisma as any).prayerCandle.count({
        where: { userHash, createdAt: { gt: new Date(Date.now() - 3600_000) } }
      });
      if (recentCount >= 5) {
        return NextResponse.json({ error: 'rate-limit', message: 'Limite de 5 bougies par heure atteinte' }, { status: 429 });
      }
    } catch { /* DB pas encore migrée */ }

    const expiresAt = new Date(Date.now() + 24 * 3600_000);
    const candle = await (prisma as any).prayerCandle.create({
      data: {
        userHash,
        intention: intention || null,
        faith,
        lat,
        lng,
        city,
        country,
        expiresAt,
        status: 'active'
      }
    });
    return NextResponse.json({ ok: true, candle: { id: candle.id, lat: candle.lat, lng: candle.lng, expiresAt: candle.expiresAt } });
  } catch (e: any) {
    return NextResponse.json({ error: 'create-failed', message: e?.message || 'unknown' }, { status: 500 });
  }
}
