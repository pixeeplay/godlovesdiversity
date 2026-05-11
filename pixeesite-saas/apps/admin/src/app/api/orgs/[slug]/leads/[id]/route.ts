import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug: orgSlug, id } = await params;
  try { await requireOrgMember(orgSlug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const tenantDb = await getTenantPrisma(orgSlug);
  const lead = await (tenantDb as any).lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  return NextResponse.json({ ok: true, lead });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug: orgSlug, id } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const tenantDb = await getTenantPrisma(orgSlug);

  const data: any = {};
  for (const k of ['firstName', 'lastName', 'phone', 'company', 'jobTitle', 'city', 'country', 'notes', 'status', 'sourceDetail', 'source'] as const) {
    if (k in body) data[k] = body[k];
  }
  if (typeof body.score === 'number') data.score = body.score;
  if (Array.isArray(body.tags)) data.tags = body.tags;
  if (Array.isArray(body.segments)) data.segments = body.segments;
  if ('newsletterOptIn' in body) {
    data.newsletterOptIn = !!body.newsletterOptIn;
    if (body.newsletterOptIn) data.optInAt = new Date();
    else data.unsubscribedAt = new Date();
  }
  // Social → customFields.social
  const social: Record<string, string> = {};
  for (const k of ['linkedinUrl', 'twitterUrl', 'instagramUrl', 'facebookUrl', 'websiteUrl'] as const) {
    if (k in body && body[k]) social[k.replace('Url', '')] = String(body[k]);
  }
  if (Object.keys(social).length > 0) {
    const existing = await (tenantDb as any).lead.findUnique({ where: { id }, select: { customFields: true } }).catch(() => null);
    const existingSocial = (existing?.customFields?.social || {}) as Record<string, string>;
    data.customFields = { ...(existing?.customFields || {}), social: { ...existingSocial, ...social } };
  }

  const lead = await (tenantDb as any).lead.update({ where: { id }, data });
  return NextResponse.json({ ok: true, lead });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug: orgSlug, id } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const tenantDb = await getTenantPrisma(orgSlug);
  await (tenantDb as any).lead.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
