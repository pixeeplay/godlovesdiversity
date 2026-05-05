import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ALLOWED_KINDS = [
  'mentor-mentee', 'mentor-mentor',
  'shelter-host', 'shelter-guest',
  'report-place',
  'meetup-rsvp', 'meetup-organizer',
  'marketplace-artisan',
  'crowdfunding-project',
  'city-coordinator',
  'membre-plus-interest'
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.kind || !ALLOWED_KINDS.includes(body.kind)) return NextResponse.json({ error: 'kind invalide' }, { status: 400 });
    const item = await prisma.userSubmission.create({
      data: {
        kind: body.kind,
        authorEmail: body.email || null,
        authorName: body.name || null,
        city: body.city || null,
        country: body.country || null,
        data: body.data || {},
        status: 'pending'
      }
    });
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Liste publique limitée (ex: meetups approuvés, projets crowdfunding, marketplace)
  const kind = req.nextUrl.searchParams.get('kind');
  const country = req.nextUrl.searchParams.get('country');
  if (!kind) return NextResponse.json({ items: [] });
  try {
    const items = await prisma.userSubmission.findMany({
      where: {
        kind,
        status: 'approved',
        ...(country ? { country } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, kind: true, authorName: true, city: true, country: true, data: true, createdAt: true }
    });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message });
  }
}
