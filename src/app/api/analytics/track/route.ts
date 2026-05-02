import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Endpoint analytics interne, RGPD-friendly :
 * - On hash visiteur = SHA256(ip + UA + date du jour) → 1 visiteur unique/jour, anonyme.
 * - Pas d'IP stockée, pas de cookie, pas de suivi cross-site.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = String(body.path || '').slice(0, 200);
    if (!path || path.startsWith('/admin') || path.startsWith('/api')) {
      return NextResponse.json({ ok: true });
    }
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0';
    const ua = req.headers.get('user-agent') || '';
    const day = new Date().toISOString().slice(0, 10);
    const visitorHash = crypto.createHash('sha256').update(`${ip}|${ua}|${day}`).digest('hex').slice(0, 24);
    const referrer = req.headers.get('referer') || null;
    const country = req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || null;

    await prisma.pageView.create({
      data: { path, visitorHash, referrer, country }
    }).catch(() => {}); // silently ignore unique conflicts (déjà compté ce visiteur sur cette page aujourd'hui)

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
