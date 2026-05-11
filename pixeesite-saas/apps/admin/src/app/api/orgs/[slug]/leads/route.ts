/**
 * /api/orgs/[slug]/leads — Tenant-scoped Leads CRM (port faithful GLD).
 *
 * GET  : liste filtrable (status, source, search, segment, optIn) + stats par status.
 * POST : crée un lead (upsert sur email si fourni). Stocke linkedin/twitter/instagram
 *        URLs dans customFields.social parce que Lead.* du schéma tenant n'a pas
 *        ces colonnes directes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  try { await requireOrgMember(orgSlug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

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

  const tenantDb = await getTenantPrisma(orgSlug);
  const [leads, total, stats] = await Promise.all([
    (tenantDb as any).lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit
    }).catch(() => []),
    (tenantDb as any).lead.count({ where }).catch(() => 0),
    (tenantDb as any).lead.groupBy({ by: ['status'], _count: true }).catch(() => [])
  ]);

  return NextResponse.json({
    ok: true,
    leads,
    pagination: { page, limit, total, hasMore: (page + 1) * limit < total },
    stats: stats.map((s: any) => ({ status: s.status, count: s._count }))
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const email = ((body.email || '') as string).trim().toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid-email' }, { status: 400 });
  }
  if (!email && !body.firstName && !body.linkedinUrl && !body.phone) {
    return NextResponse.json({ error: 'at-least-one-field-required' }, { status: 400 });
  }

  const social: Record<string, string> = {};
  if (body.linkedinUrl) social.linkedin = String(body.linkedinUrl);
  if (body.twitterUrl) social.twitter = String(body.twitterUrl);
  if (body.instagramUrl) social.instagram = String(body.instagramUrl);
  if (body.facebookUrl) social.facebook = String(body.facebookUrl);
  if (body.websiteUrl) social.website = String(body.websiteUrl);

  const tenantDb = await getTenantPrisma(orgSlug);
  try {
    const existing = email ? await (tenantDb as any).lead.findUnique({ where: { email } }).catch(() => null) : null;
    if (existing) {
      const existingSocial = (existing.customFields?.social || {}) as Record<string, string>;
      const updated = await (tenantDb as any).lead.update({
        where: { id: existing.id },
        data: {
          firstName: body.firstName || existing.firstName,
          lastName: body.lastName || existing.lastName,
          phone: body.phone || existing.phone,
          company: body.company || existing.company,
          jobTitle: body.jobTitle || existing.jobTitle,
          city: body.city || existing.city,
          country: body.country || existing.country,
          notes: body.notes || existing.notes,
          tags: body.tags || existing.tags,
          segments: body.segments || existing.segments,
          score: typeof body.score === 'number' ? body.score : existing.score,
          customFields: { ...(existing.customFields || {}), social: { ...existingSocial, ...social } }
        }
      });
      return NextResponse.json({ ok: true, lead: updated, merged: true });
    }

    const lead = await (tenantDb as any).lead.create({
      data: {
        email: email || null,
        firstName: body.firstName || null,
        lastName: body.lastName || null,
        phone: body.phone || null,
        company: body.company || null,
        jobTitle: body.jobTitle || null,
        city: body.city || null,
        country: body.country || null,
        source: body.source || 'manual',
        sourceDetail: body.sourceDetail || null,
        status: body.status || 'new',
        score: body.score || 0,
        tags: body.tags || [],
        segments: body.segments || [],
        notes: body.notes || null,
        newsletterOptIn: !!body.newsletterOptIn,
        optInAt: body.newsletterOptIn ? new Date() : null,
        customFields: Object.keys(social).length > 0 ? { social } : null
      }
    });
    return NextResponse.json({ ok: true, lead });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
