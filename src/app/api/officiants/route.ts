import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/officiants?faith=&service=&country=
 *  Liste les officiants LGBT-friendly publiés.
 *
 * POST /api/officiants/booking { officiantId, requesterName, requesterEmail, serviceType, proposedDate?, city?, message? }
 *  Crée une demande de réservation.
 */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const where: any = { published: true };
  const faith = url.searchParams.get('faith');
  const service = url.searchParams.get('service');
  const country = url.searchParams.get('country');
  if (faith) where.faith = faith;
  if (country) where.country = country;
  if (service) where.servicesOffered = { has: service };
  try {
    const officiants = await (prisma as any).inclusiveOfficiant.findMany({
      where,
      orderBy: [{ verified: 'desc' }, { name: 'asc' }],
      take: 200
    });
    return NextResponse.json({ officiants });
  } catch { return NextResponse.json({ officiants: [] }); }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const officiantId = String(body.officiantId || '');
  const requesterName = String(body.requesterName || '').slice(0, 100).trim();
  const requesterEmail = String(body.requesterEmail || '').slice(0, 100).trim();
  if (!officiantId || !requesterName || !requesterEmail.includes('@')) {
    return NextResponse.json({ error: 'champs-manquants' }, { status: 400 });
  }
  const serviceType = String(body.serviceType || 'autre');
  const message = String(body.message || '').slice(0, 2000);
  const city = String(body.city || '').slice(0, 80) || null;
  const proposedDate = body.proposedDate ? new Date(body.proposedDate) : null;

  try {
    const booking = await (prisma as any).officiantBooking.create({
      data: { officiantId, requesterName, requesterEmail, serviceType, proposedDate, city, message, status: 'pending' }
    });
    return NextResponse.json({ ok: true, booking: { id: booking.id, status: booking.status } });
  } catch (e: any) {
    return NextResponse.json({ error: 'create-failed', message: e?.message }, { status: 500 });
  }
}
