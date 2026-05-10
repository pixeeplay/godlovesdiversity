import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) return null;
  return s;
}

/**
 * GET /api/admin/leads — liste paginée + filtres
 * Query : ?status=qualified&source=csv-import&search=foo&segment=press&page=0&limit=50
 */
export async function GET(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const page = Math.max(0, Number(url.searchParams.get('page')) || 0);
  const limit = Math.min(200, Math.max(10, Number(url.searchParams.get('limit')) || 50));
  const status = url.searchParams.get('status');
  const source = url.searchParams.get('source');
  const segment = url.searchParams.get('segment');
  const search = url.searchParams.get('search');
  const optInOnly = url.searchParams.get('optIn') === '1';

  const where: any = {};
  if (status) where.status = status;
  if (source) where.source = source;
  if (segment) where.segments = { has: segment };
  if (optInOnly) where.newsletterOptIn = true;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [leads, total, stats] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
      include: { _count: { select: { interactions: true } } }
    }),
    prisma.lead.count({ where }),
    prisma.lead.groupBy({ by: ['status'], _count: true }).catch(() => [])
  ]);

  return NextResponse.json({
    ok: true,
    leads,
    pagination: { page, limit, total, hasMore: (page + 1) * limit < total },
    stats: stats.map((s: any) => ({ status: s.status, count: s._count }))
  });
}

/** POST /api/admin/leads — crée un lead manuellement */
export async function POST(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = (body.email || '').trim().toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid-email' }, { status: 400 });
  }
  if (!email && !body.firstName && !body.linkedinUrl && !body.phone) {
    return NextResponse.json({ error: 'at-least-one-field-required' }, { status: 400 });
  }

  // Si email existe déjà → update
  const existing = email ? await prisma.lead.findUnique({ where: { email } }).catch(() => null) : null;
  if (existing) {
    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        firstName: body.firstName || existing.firstName,
        lastName: body.lastName || existing.lastName,
        phone: body.phone || existing.phone,
        company: body.company || existing.company,
        jobTitle: body.jobTitle || existing.jobTitle,
        city: body.city || existing.city,
        country: body.country || existing.country,
        linkedinUrl: body.linkedinUrl || existing.linkedinUrl,
        twitterUrl: body.twitterUrl || existing.twitterUrl,
        instagramUrl: body.instagramUrl || existing.instagramUrl,
        notes: body.notes || existing.notes,
        tags: body.tags || existing.tags,
        segments: body.segments || existing.segments,
        score: typeof body.score === 'number' ? body.score : existing.score
      }
    });
    return NextResponse.json({ ok: true, lead: updated, merged: true });
  }

  const lead = await prisma.lead.create({
    data: {
      email: email || null,
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      phone: body.phone || null,
      company: body.company || null,
      jobTitle: body.jobTitle || null,
      city: body.city || null,
      country: body.country || null,
      linkedinUrl: body.linkedinUrl || null,
      twitterUrl: body.twitterUrl || null,
      instagramUrl: body.instagramUrl || null,
      facebookUrl: body.facebookUrl || null,
      websiteUrl: body.websiteUrl || null,
      source: body.source || 'manual',
      sourceDetail: body.sourceDetail || null,
      status: body.status || 'new',
      score: body.score || 0,
      tags: body.tags || [],
      segments: body.segments || [],
      notes: body.notes || null,
      newsletterOptIn: !!body.newsletterOptIn,
      optInAt: body.newsletterOptIn ? new Date() : null
    }
  });

  return NextResponse.json({ ok: true, lead });
}
