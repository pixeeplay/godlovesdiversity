/**
 * /api/orgs/[slug]/email-templates — CRUD email templates tenant.
 * Modèle Prisma : { id, name, type, subject, body, variables, active }
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
  const type = url.searchParams.get('type');
  const where: any = {};
  if (type) where.type = type;
  const tenantDb = await getTenantPrisma(orgSlug);
  const templates = await (tenantDb as any).emailTemplate.findMany({
    where, orderBy: { updatedAt: 'desc' }, take: 200
  }).catch(() => []);
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const data: any = {
    name: (body.name as string)?.trim() || 'Sans titre',
    type: (body.type as string) || 'custom',
    subject: body.subject || null,
    body: body.body || '',
    variables: Array.isArray(body.variables) ? body.variables : [],
    active: body.active !== false
  };
  const tenantDb = await getTenantPrisma(orgSlug);
  const template = await (tenantDb as any).emailTemplate.create({ data });
  return NextResponse.json({ ok: true, template });
}
