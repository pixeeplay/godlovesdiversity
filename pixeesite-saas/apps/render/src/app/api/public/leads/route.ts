import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public lead capture endpoint — used by /contact form, custom forms, etc.
 * Rate-limit candidate (TODO: add Redis-backed limiter).
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const orgSlug = url.searchParams.get('org');
  if (!orgSlug) return NextResponse.json({ error: 'org required' }, { status: 400 });
  const b = await req.json();
  if (!b.email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  try {
    const db = await getTenantPrisma(orgSlug);
    const lead = await db.lead.upsert({
      where: { email: b.email.toLowerCase() },
      create: {
        email: b.email.toLowerCase(),
        firstName: b.firstName,
        lastName: b.lastName,
        phone: b.phone,
        company: b.company,
        notes: b.notes,
        source: b.source || 'public-form',
        sourceDetail: b.sourceDetail,
        newsletterOptIn: !!b.newsletterOptIn,
      },
      update: {
        ...(b.firstName && { firstName: b.firstName }),
        ...(b.lastName && { lastName: b.lastName }),
        ...(b.phone && { phone: b.phone }),
        ...(b.notes && { notes: b.notes }),
        contactCount: { increment: 1 },
        lastContactedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 });
  }
}
